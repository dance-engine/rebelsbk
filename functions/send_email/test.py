from lambda_function import lambda_handler
# import boto3

#* This is not required for deployment only needed for local testing 
# logging.basicConfig()
# profile_name='AdministratorAccess-645491919786'
# boto3.setup_default_session(profile_name=profile_name)

event = {
    "email_type": "standard_ticket", 
    "name": "T Enzyme", 
    "email": "toaster_amylase0a@icloud.com", 
    "ticket_number": "7227400839",
    "line_items": [
        {"price_id": 'price_1PZcrKEWkmdeWsQPl1h22Dk4', "amount_total": 0, "description": "February prebook", "prod_id": "prod_QQToHXWAJ7kCf4"}, 
    ],
    "parent_event": "Rebel SBK Noches February",
    "is_prebook": True
}

lambda_handler(event, None)