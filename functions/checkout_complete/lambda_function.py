import stripe
import json
# from gdrivewrite import update_gs
# from sendmail import sendemail
from random import randint
import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import os
import logging
from decimal import Decimal
from shared import DecimalEncoder as shared
# from json.decoder import JSONDecodeError

# class DecimalEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, Decimal):
#             if float(obj) == int(obj):
#                 return int(obj)
#             elif str(float(obj)) == str(obj):
#                 return float(obj)
#             else:
#                 return float(obj)
#         return super().default(obj)

logger = logging.getLogger()
logger.setLevel("INFO")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

# get dynamodb table
db = boto3.resource('dynamodb')
table = db.Table(os.environ.get("ATTENDEES_TABLE_NAME"))

lambda_client = boto3.client('lambda')
# class DecimalEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, Decimal):
#             return str(obj)
#         return super().default(obj)

# Turn line items into a array detailing the access the person has i.e. what
# parts of the fetival.
# [Fri-Party, Sat-Class, Sat-Din, Sat-Party, Sun-Class, Sun-Party]
# Will also return a string of the passes the person has purchased.
def process_line_items(line_items, stripe_response):
    access = [0,0,0,0,0,0]
    line_items_return = []
    for item in line_items['data']:
        try:
            access_metadata = json.loads(item['price']['product']['metadata']['access'])
            access = [sum(i) for i in zip(access, access_metadata)]
        except (KeyError, json.JSONDecodeError, TypeError):
            logger.warning("Access metadata not available or invalid for item: %s", item)
            access = None
            break

        line_items_return.append({
                'prod_id':item['price']['product']['id'],
                'price_id':item['price']['id'],
                'description':item['description'],
                'amount_total':item['amount_total']
            })

    if 'total_details' in stripe_response and 'breakdown' in stripe_response['total_details']:
        discounts = stripe_response['total_details']['breakdown'].get('discounts', [])
        for discount in discounts:
            discount_data = discount['discount']
            coupon = discount_data.get('coupon', {})
            line_items_return.append({
                'amount_total': discount['amount'],
                'description': 'discount',
                'discount_id': discount_data.get('id', 'unknown'),
                'coupon_id': coupon.get('id', 'unknown'),
                'coupon_name': coupon.get('name', 'unknown'),
                'promotion_code': discount_data.get('promotion_code', 'unknown')
            })

    return access, line_items_return

# Main function to handle the event
def lambda_handler(event, context):
    logger.info(event)
    # get event data
    ev_data = json.loads(event['body'])
    # ev_data = event['body'] # for use if testing with input as json already

    # Only execute for a completed checkout session
    if ev_data['type'] == "checkout.session.completed":
        # get the checkout session ID
        CHECKOUT_SESSION_ID = ev_data['data']['object']['id']
                  
        # retrieve the full checkout session including the line items
        logger.info("Retrieve Stripe checkout session")
        try:
            #! Should check if already processed that checkout session ID first, i.e. is it in the DynamoDB
            stripe_response = stripe.checkout.Session.retrieve(CHECKOUT_SESSION_ID, expand=['line_items', 'line_items.data.price.product', 'total_details.breakdown.discounts'])
            logger.info(stripe_response)
        except (stripe.error.InvalidRequestError) as e:
            logger.error(e)
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Checkout session does not exist'})
            }

        if stripe_response['metadata'].get('ticket_upgrade', False):
            ticket_number = stripe_response.get('client_reference_id', None)
            full_name = next((item for item in stripe_response['custom_fields'] if item["key"] == "fullname"), {}).get('text', {}).get('value', "unknown")
            access, line_items = process_line_items(stripe_response['line_items'], stripe_response)

            payload = {
                    'ticket_number': ticket_number,
                    'source': "stripe_checkout",
                    'upgrade_type': stripe_response['metadata'].get('upgrade_type', 'unknown'),
                    'full_name': full_name,
                    'line_items': line_items
                    }

            # upgrade the ticket
            logger.info("Invoking ticket_upgrade lambda")
            response = lambda_client.invoke(
                FunctionName=os.environ.get("TICKET_UPGRADE_LAMBDA"),
                InvocationType='Event',
                Payload=json.dumps(payload, cls=shared.DecimalEncoder),
                )
            logger.info(response)  
            
            return {'statusCode':200}
                                

        access, line_items = process_line_items(stripe_response['line_items'], stripe_response)
        student_ticket = True if stripe_response['line_items']['data'][0]['price']['nickname' ] == "student_active" else False
        meal = json.loads(stripe_response['metadata']['preferences']) if 'preferences' in stripe_response['metadata'] else None

        parent_event = stripe_response['metadata']['parent_event']

        # customer information to keep
        ateendee_details = json.loads(stripe_response['metadata']['attendee'])
        full_name = ateendee_details['name']
        email     = stripe_response['customer_email']
        phone     = ateendee_details['phone']

        payload = {
                'email': email,      
                'full_name': full_name,
                'phone':phone,
                'purchase_date': str(stripe_response['created']),
                'line_items': line_items,
                'access': access,
                'status': "paid_stripe",
                'student_ticket': student_ticket,
                'promo_code': None,
                'meal_preferences': meal,
                'checkout_session': CHECKOUT_SESSION_ID, 
                'schedule': None,
                'heading_message':"THANK YOU FOR YOUR PURCHASE!",
                'send_standard_ticket': True,
                'parent_event': parent_event
                }
        
        if 'group' in stripe_response['metadata']:
            payload['group'] = stripe_response['metadata']['group']

        # Create the ticket
        logger.info("Invoking create_ticket lambda")
        response = lambda_client.invoke(
            FunctionName=os.environ.get("CREATE_TICKET_LAMBDA"),
            InvocationType='Event',
            Payload=json.dumps(payload, cls=shared.DecimalEncoder),
            )
        logger.info(response)
            
    return {'statusCode':200}