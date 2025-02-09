# import stripe
import json
# from gdrivewrite import update_gs
# from sendmail import sendemail
from random import randint
import time
import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal
import os
import logging
from shared import DecimalEncoder as shared

logger = logging.getLogger()
logger.setLevel("INFO")

# logging.basicConfig()
# profile_name='AdministratorAccess-645491919786'
# boto3.setup_default_session(profile_name=profile_name)

# stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

# get dynamodb table
db = boto3.resource('dynamodb')
table = db.Table(os.environ.get("ATTENDEES_TABLE_NAME"))
event_table = db.Table(os.environ.get("EVENT_TABLE_NAME"))

lambda_client = boto3.client('lambda')

# class DecimalEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, Decimal):
#             return str(obj)
#         return super().default(obj)

def process_line_items(line_items):
    return ''.join([", "+i['description'] for i in line_items])[2:], sum([i['amount_total'] for i in line_items])

# Generate a random ticket number
#! this bit could be done quicker
def get_ticket_number(email, student_ticket):
    search = True
    # generate a new ticket number if it is already used in the table
    while search:
        ticketnumber = str(randint(1000000000, 9999999999)) if student_ticket == False else str(55)+str(randint(1000000000, 9999999999))[:-2]
        response = table.query(KeyConditionExpression=Key('ticket_number').eq(ticketnumber) & Key('email').eq(email))
        if response['Count'] == 0:
            search = False
    logger.info("ticket number generated: "+str(ticketnumber))
    return ticketnumber

# put the corresponding data into the dynamodb table
def update_ddb(Item):
    table.put_item(Item=Item)
    return True

def add_group(ticket_number, email, name, group_id, timestamp, recs):
    logger.info("Invoking group lambda")
    response = lambda_client.invoke(
        FunctionName=os.environ.get("ATTENDEE_GROUPS_LAMBDA"),
        InvocationType='Event',
        Payload=json.dumps({
                'requestContext':{'http': {'method': "POST"}},
                'body': json.dumps({
                    'ticket_number':ticket_number, 
                    'email':email,
                    'full_name': name,
                    'group_id':group_id, 
                    'timestamp': timestamp,
                    'recs': recs,
                })
            }, cls=shared.DecimalEncoder),
        )
    logger.info(response)    

# Main function to handle the event
def lambda_handler(event, context):
    '''
    {
    'email': "john_doe@example.com",      
    'full_name': "John Doe",
    'purchase_date': 1721571296,
    'line_items': {[
        'amount_total': 4500,
        'description': 'Party Pass',
        'price_id': "price_xxxxx"
    }],
    'access': [1,0,0,1,0,1],
    'status': "paid_stripe"|"paid_cash"|"refunded_stripe"|"refunded_cash",
    'student_ticket': True|False,
    'promo_code': None|{
        'code': "MLF",
        'value': 500
    },
    'meal_preferences': None|{},
    'checkout_session': None|"cs_xxxxxx", 
    'schedule': {},
    'heading_message':"THANK YOU FOR YOUR PURCHASE",
    'send_standard_ticket': True|False,
    }
    '''

    logger.info("#### GENERATING A NEW TICKET ####")
    logger.info(event)

    # process the line items and get the string of items purchased for gsheet

    full_name = event['full_name']
    email     = event['email']
    phone     = event['phone']
    
    logger.info("Getting ticket number")
    ticket_number = get_ticket_number(email, event['student_ticket'])

    parent_event_data = event_table.get_item(Key={'PK':event['parent_event'], 'SK':event['parent_event']}).get('Item')

    if not parent_event_data:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': "Event not found"
            })
        }
    
    total_capacity = parent_event_data.get('total_capacity', None)
    tickets_sold = parent_event_data.get('number_sold', 0)

    if total_capacity is not None and tickets_sold >= total_capacity:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': "Event is at full capacity."
            })
        }    

    # put the information into dynamodb table
    logger.info("Putting ticket into DynamoDB")
    Item = {
        'ticket_number': str(ticket_number),
        'email': event['email'],      
        'full_name':event['full_name'],
        'phone': event['phone'],
        'active': True,
        'purchase_date':event['purchase_date'],
        'line_items': event['line_items'],
        'access':event['access'],
        'ticket_used': False,
        'status':event['status'],
        'student_ticket': event['student_ticket'],
        'schedule': event['schedule'] if 'schedule' in event else None,
        'checkout_session':event['checkout_session'] if 'checkout_session' in event else None,
        'meal_preferences':event['meal_preferences'] if 'meal_preferences' in event else None,
        'promo_code':event['promo_code'] if 'promo_code' in event else None,
        'history':event['history'] if 'history' in event else [],
        'parent_event':event['parent_event'],
    }
    update_ddb = table.put_item(Item=Item)
    logger.info(update_ddb)

    if ('group' in event):
        group = json.loads(event['group']) if type(event['group']) != dict else event['group']
        recs = group['recommendations'] if 'recommendations' in group else None
        if group['id'] != "":
            add_group(ticket_number, email, event['full_name'], group['id'], time.time(), recs)

    is_prebook = True if "prebook" in event['line_items'][0]['description'].lower() else False

    if ('send_standard_ticket' in event):
        if event['send_standard_ticket']:
            # send the email with these details
            logger.info("Invoking send_email lambda")
            response = lambda_client.invoke(
                FunctionName=os.environ.get("SEND_EMAIL_LAMBDA"),
                InvocationType='Event',
                Payload=json.dumps({
                        'email_type':"standard_ticket",
                        'name':event['full_name'], 
                        'email':event['email'], 
                        'ticket_number':ticket_number, 
                        'line_items':event['line_items'],
                        'parent_event': event['parent_event'],
                        'is_prebook': is_prebook
                    }, cls=shared.DecimalEncoder),
                )
            logger.info(response)

    #! GOOGLE SHEET
    # pass_type, total = process_line_items(event['line_items'])
    # purchase_date = str(datetime.datetime.utcfromtimestamp(response['created']))
    # # Put the information into the gsheet
    # gs_response = update_gs([full_name,
    #           pass_type,
    #           payment_method,
    #           payment_status,
    #           amount,
    #           amount-0.2-(amount*0.015),
    #           email,
    #           phone,
    #           str(datetime.datetime.utcfromtimestamp(response['created'])),
    #           cs_id,
    #           ticket_number,
    #           access[0], access[1], access[2], access[3], access[4], access[5],
    #           ticket_used])
            
    return {'ticket_number':ticket_number}