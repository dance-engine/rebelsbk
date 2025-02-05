import os
import logging
import time
import json
from random import randint

import boto3
from boto3.dynamodb.conditions import Key
from shared.DecimalEncoder import DecimalEncoder
from shared.parser import parse_event, validate_event, validate_line_items

#ENV
attendees_table_name = os.environ.get("ATTENDEES_TABLE_NAME")
event_table_name     = os.environ.get("EVENT_TABLE_NAME")
send_email_lambda    = os.environ.get("SEND_EMAIL_LAMBDA")

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource('dynamodb')
attendees_table = db.Table(attendees_table_name)
event_table = db.Table(event_table_name) 

lambda_client = boto3.client('lambda')

def record_fail(event, reason):
    '''
    Records details of a fail
    '''
    logger.info("Recording failed upgrade attempt.")
    current_time = int(time.time())
    pk = f"CHECKOUTFAIL#{event.get('checkout_session', 'unknown')}"
    sk = f"ERROR#{current_time}"

    backup_entry = {
        'PK': pk,
        'SK': sk,
        'timestamp': current_time,
        'email': event.get('email', 'unknown'),
        'full_name': event.get('full_name', 'unknown'),
        'reason': reason,
        'event_details': json.dumps(event, cls=DecimalEncoder)
    }

    try:
        event_table.put_item(Item=backup_entry)
        logger.info("Failure recorded successfully.")
    except boto3.exceptions.Boto3Error as e:
        logger.error("Error recording failed attempt: %s", str(e))

def process_line_items(line_items):
    return ''.join([", "+i['description'] for i in line_items])[2:], sum([i['amount_total'] for i in line_items])

# Generate a random ticket number
#! this bit could be done quicker
def get_ticket_number(email, student_ticket):
    search = True
    # generate a new ticket number if it is already used in the table
    while search:
        ticketnumber = str(randint(1000000000, 9999999999)) if student_ticket == False else str(55)+str(randint(1000000000, 9999999999))[:-2]
        response = attendees_table.query(KeyConditionExpression=Key('ticket_number').eq(ticketnumber) & Key('email').eq(email))
        if response['Count'] == 0:
            search = False
    logger.info("ticket number generated: "+str(ticketnumber))
    return ticketnumber

def lambda_handler(event, context):
    try:
        event = parse_event(event)
        event = validate_event(event, ['email', 'status', 'purchase_date', 'event'])
        if event.get('line_items', None):
            validate_line_items(event['line_items'])
    except (ValueError, TypeError, KeyError) as e:
        logger.error("Event validation failed: %s", str(e))
        logger.error(event)
        return {
            'statusCode': 400,
            'body': f'Invalid input: {str(e)}'
        }
    
    logger.info("#### CREATING TICKET ####")
    logger.info("Event received: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
    
    full_name = event.get('full_name', 'unknown')
    email = event.get('email', 'unknown')
    phone = event.get('phone', None)
    line_items = event.get('line_items')
    access = event.get('access', [0,0,0,0,0,0])
    status = event.get('status', 'unknown')
    purchase_date = event.get('purchase_date', int(time.time()))
    student_ticket = event.get('student_ticket', False)
    checkout_session = event.get('checkout_session', 'unknown')
    parent_event = event.get('event')

    parent_event_data = event_table.get_item(Key={'PK':parent_event, 'SK':parent_event}).get('Item')
    
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
    
    logger.info("Getting ticket number")
    ticket_number = get_ticket_number(email, student_ticket)

    item = {
        'ticket_number': str(ticket_number),
        'email': email,      
        'full_name': full_name,
        'phone': phone,
        'active': True,
        'purchase_date':purchase_date,
        'line_items': line_items,
        'access': access,
        'ticket_used': False,
        'status': status,
        'student_ticket': student_ticket,
        'checkout_session': checkout_session,
        'parent_event': parent_event,
        'marketing_preference': event.get('marketing'),
        'questionnaire_answers':event.get("answers", {})

    }

    optional = ['schedule', 'meal_preferences', 'promo_code', 'history']

    for key in optional:
        if key in event:
            item[key] = event.get(key)

    attendees_table.put_item(Item=item)

    is_prebook = True if "prebook" in line_items[0]['description'].lower() else False

    try:
        if event.get('send_standard_ticket', True):
            # send the email with these details
            logger.info("Invoking send_email lambda")
            response = lambda_client.invoke(
                FunctionName=send_email_lambda,
                InvocationType='Event',
                Payload=json.dumps({
                        'email_type':"standard_ticket",
                        'name':full_name, 
                        'email':email, 
                        'ticket_number':ticket_number, 
                        'line_items':line_items,
                        'parent_event': parent_event,
                        'is_prebook': is_prebook,
                        'parent_event_name':parent_event_data['name']
                    }, cls=DecimalEncoder),
                )
            logger.info(response)
    except boto3.exceptions.Boto3Error as e:
        logger.error("Failed to invoke send_email lambda: %s", str(e))
        record_fail(event, f"Failed to send confirmation email: {str(e)}")   

    event_table.update_item(
        Key={'PK':parent_event, 'SK':parent_event},
        UpdateExpression="SET number_sold = number_sold + :inc",
        ExpressionAttributeValues={':inc': 1},
        ConditionExpression="number_sold < total_capacity"
    )                 

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': "Ticket created successfully",
            'ticket_number': ticket_number,
            'email': email
        })
    }