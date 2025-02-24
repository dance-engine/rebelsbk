import boto3
from boto3.dynamodb.conditions import Key, Attr
import json
import os
import logging
from decimal import Decimal
from json.decoder import JSONDecodeError
logger = logging.getLogger()
logger.setLevel("INFO")
from shared import DecimalEncoder as shared
import time

# #* This is not required for deployment only needed for local testing 
# logging.basicConfig()
# profile_name='AdministratorAccess-645491919786'
# boto3.setup_default_session(profile_name=profile_name)

ATTENDEES_TABLE_NAME = os.environ.get("ATTENDEES_TABLE_NAME")
EVENT_TABLE_NAME = os.environ.get("EVENT_TABLE_NAME")

db = boto3.resource('dynamodb')
attendees_table = db.Table(ATTENDEES_TABLE_NAME)
event_table = db.Table(EVENT_TABLE_NAME)

def get_dinner_ticket(ticket_number):
    '''
    
    '''
    response = event_table.query(KeyConditionExpression=Key('PK').eq(f"DINNERTICKET#{ticket_number}"))
    if response['Count'] == 0: 
        raise ValueError("Ticket not found")
    elif response['Count'] > 1:
        logger.warning("More than one db entry has been found when only one is expected.")
        raise ValueError("An internal error has occured.")
    else:
        return response['Items'][0]

def get_ticket(ticket_number):
    '''

    '''
    response = attendees_table.query(IndexName='ticket_number-index',KeyConditionExpression=Key('ticket_number').eq(ticket_number))
    if response['Count'] == 0: 
        raise ValueError("Ticket not found")
    elif response['Count'] > 1:
        logger.warning("More than one db entry has been found when only one is expected.")
        raise ValueError("An internal error has occured.")
    else:
        return response['Items'][0]

def err(msg:str, code=400, logmsg=None, **kwargs):
    logmsg = logmsg if logmsg else msg
    logger.error(logmsg)
    for k in kwargs:
        logger.error(k+":"+kwargs[k])
    return {
        'statusCode': code, 
        'body': json.dumps({'error': msg})
        }

def post(event):
    '''

    '''
    # get data and check if it is proper JSON return error if not
    try:
        data = json.loads(event['body'])
        logger.info(data)
    except (TypeError, JSONDecodeError) as e:
        logger.error(e)
        return err("An error has occured with the input you have provided.", event_body=event['body'])
    
    if 'meal_ticket' in data:
        if ('ticket_number' not in data) and ('check_in_at' not in data):
            return err("Must provide ticket_number and a scan in timestamp.")
        else:
            ticket_number = data['ticket_number'] # Ticket numerbs are strings now
            check_in_at = data['check_in_at']    
            created_at = data['created_at']
            source = data.get('source', 'unknown')

        params = {
            'Key': {
                'PK':f"DINNERTICKET#{ticket_number}",
                'SK':f"DETAL#{created_at}"
            },
            'ConditionExpression':'attribute_exists(PK)',
            'UpdateExpression':'SET used_at = :val1, history =  list_append(history, :val2)',
            'ExpressionAttributeValues' : {
                ':val1': check_in_at,
                ':val2': [  {
                    "action": "check_in" if check_in_at else "check_in_reset",
                    "description": "Ticket was scanned and checked in" if check_in_at else "Previous check in was reset" ,
                    "source": source,
                    "timestamp": check_in_at if check_in_at else int(time.time())
                    }]
            }
        }           

    #     # try to update db
    #     # if email or ticket number do not exist or do not match then return an error 
        try:
            logger.info(params)
            response = event_table.update_item(**params)
            return {'statusCode': 200, 'body': json.dumps({'message':"Ticket Scanned"})}
        except db.meta.client.exceptions.ConditionalCheckFailedException as e:
            logger.error(e)
            return err("Ticket number does not exist")

    else:
        # check that ticket number and email and check_in are all set return error if not
        if ('ticket_number' not in data) and ('email' not in data) and ('check_in_at' not in data):
            return err("Must provide ticket_number and email and a scan in timestamp.")
        else:
            ticket_number = data['ticket_number'] # Ticket numerbs are strings now
            email = data['email']
            check_in_at = data['check_in_at']
            source = data.get('source', 'unknown')

        params = {
            'Key': {
                'email':email,
                'ticket_number':ticket_number
            },
            'ConditionExpression':'attribute_exists(ticket_number)',
            'UpdateExpression':'SET ticket_used = :val1, history =  list_append(if_not_exists(history,:empty_list), :val2)',
            'ExpressionAttributeValues' : {
                ':val1': check_in_at,
                ':val2': [  {
                    "action": "check_in" if check_in_at else "check_in_reset",
                    "description": "Ticket was scanned and checked in" if check_in_at else "Previous check in was reset" ,
                    "source": source,
                    "timestamp": check_in_at if check_in_at else int(time.time())
                    }],
                ":empty_list": []                
                }   
        }

    #     # try to update db
    #     # if email or ticket number do not exist or do not match then return an error 
        try:
            logger.info(params)
            response = attendees_table.update_item(**params)
            return {'statusCode': 200, 'body': json.dumps({'message':"Ticket Scanned"})}
        except db.meta.client.exceptions.ConditionalCheckFailedException as e:
            logger.error(e)
            return err("Ticket number does not exist or match email.")


def get(event):
    '''

    '''
    # get data and check that stuff exists
    logger.info(event)
    data = event['queryStringParameters'] 
    if ('ticket_number' not in data):
        logger.error("ticket_number not set")
        return err("Must provide ticket_number.")
    else:
        # if data['ticket_number'].isnumeric() is False: 
        #     logger.error("ticket_number is not numeric")
        #     logger.error(data['ticket_number'])
        #     return err("ticket number not int-like")
        ticket_number = data['ticket_number']

    # query db for ticket number and email, if don't match or exist return error
    # return internal server error if there is more than one response item as something must have gone wrong
    try:
        logger.info(ticket_number)
        if ticket_number.startswith("GD15"):
            ticket_entry = get_dinner_ticket(ticket_number)
            ticket_entry['meal_ticket'] = True
        else:
            if ticket_number.isnumeric() is False: 
                logger.error("ticket_number is not numeric")
                logger.error(data['ticket_number'])
                return err("ticket number not int-like")
            else:
                ticket_entry = get_ticket(ticket_number)
                logger.info(ticket_entry)
    except ValueError as e:
        return err(str(e))

    lambdaResponse = {
            'statusCode': 200,
            'body': json.dumps(ticket_entry, cls=shared.DecimalEncoder),
            "headers": {
                "Content-Type": "application/json"
            }
        }
    logger.info(lambdaResponse)
    return lambdaResponse

def lambda_handler(event, context):
    '''

    '''    
    
    if event['requestContext']['http']['method'] == 'POST':
        logger.info('## NEW GET REQUEST')
        return post(event)
    elif event['requestContext']['http']['method'] == 'GET':
        logger.info('## NEW POST REQUEST')
        return get(event)
    else:
        logger.info('## Weird REQUEST')
        return {
            'statusCode': 405,
            'body': "Method Not Allowed"
        }  