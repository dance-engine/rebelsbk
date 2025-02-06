import ssl

try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    # Legacy Python that doesn't verify HTTPS certificates by default
    pass
else:
    # Handle target environment that doesn't support HTTPS verification
    ssl._create_default_https_context = _create_unverified_https_context

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from string import Template
import base64
import sendgrid
from sendgrid.helpers.mail import *
import qrcode
import io
import babel.numbers
import os
import json
import logging
from shared.parser import parse_event, validate_event, validate_line_items

logger = logging.getLogger()
logger.setLevel("INFO")
logging.basicConfig()

#ENV
stage_name = os.environ.get("STAGE_NAME")
sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
maildev_ip = os.environ.get("MAILDEV_IP", "localhost")
from_email = os.environ.get("FROM_EMAIL", "do-not-reply@email.merseysidelatinfestival.co.uk")

def send_email_sendgrid(from_email, to_email, subject, html_content, qr_ticket=None):
    '''    
    Send email using SendGrid
    '''
    logger.info("Create the Mail object")
    message = Mail(
        from_email=from_email,
        to_emails=to_email,
        subject=subject,
        html_content=html_content
    )
    
    logger.info("Adding qr_ticket if any exist")
    if qr_ticket is not None:
        attachment = Attachment(
            FileContent(qr_ticket),
            FileName('qrticket.jpg'),
            FileType('image/jpeg'),
            Disposition('inline'),
            ContentId('qr-ticket')
        )
        message.add_attachment(attachment)

    logger.info("Attempting to send email via SendGrid")
    try:
        sg = sendgrid.SendGridAPIClient(api_key=sendgrid_api_key)
        response = sg.send(message)
        return "Success"
    except Exception as e:
        print(e)
        return e
    
def send_email_preview(from_email, to_email, subject, html_content, qr_ticket=None):
    '''    
    Send email in preview mode
    '''    
    logger.info("Creating the email for preview")

    port = 1025
    smtp_server = maildev_ip
    login = "987p6absdkjl"
    password = "875sadv&oa8s7td"

    # Create a multipart message and set headers
    message = MIMEMultipart("alternative")
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject

    # Attach the HTML content
    message.attach(MIMEText(html_content, "html"))

    if qr_ticket is not None:
        logger.info("Adding attachment to preview email")
        mime_base = MIMEBase("application", "octet-stream")
        mime_base.set_payload(qr_ticket)
        encoders.encode_base64(mime_base)

        mime_base.add_header(
            "Content-Disposition",
            f"attachment; filename=qrticket.jpg",
        )
        message.attach(mime_base)

    # Send the email using smtplib
    try:
        with smtplib.SMTP(smtp_server, port) as server:
            server.login(login, password)
            server.sendmail(from_email, to_email, message.as_string())
        logger.info("Email sent successfully in preview")
        return "Preview Success"
    except Exception as e:
        logger.error("Failed to send email in preview: %s", e)
        return e

def group_rec(data):
    '''
    Expects in data: email, group_id, [ticket_number]
    '''
    has_ticket = True if "ticket_number" in data else False

    body_text = "you can join by changing your preferences with the link below." if has_ticket \
        else "but when you purchase your ticket which includes dinner you will have the choice to enter a group code."
    
    subdomain = "www" if stage_name == "prod" else stage_name
    ticket_link = "http://{}.merseysidelatinfestival.co.uk/preferences?email={}&ticket_number={}".format(subdomain,data['email'], data['ticket_number']) if has_ticket \
        else "https://{}.merseysidelatinfestival.co.uk/tickets".format(subdomain)
    
    button_text = "MANAGE YOUR TICKET" if has_ticket else "BUY YOUR TICKET"

    with open("./send_email/group_body.html", 'r') as group_body_file:
        group_tmpl = Template(group_body_file.read())
        group_body = group_tmpl.substitute({
            'body_text' : body_text, 
            'group_code' : data['group_id'], 
            'ticket_link': ticket_link,
            'button_text': button_text, 
            'rec_name': data['name']
        }) 
    return group_body
    
def generate_standard_ticket_body(data):
    logger.info(json.dumps(data, indent=2))
    rows = ""
    total_amount = 0
    # generate table of items purchased
    for i,item in enumerate(data['line_items']):
        with open("./send_email/ticket_row.html", 'r') as line_item_row_file:
            line_item_tmpl = Template(line_item_row_file.read())
            rows = rows+"\n"+line_item_tmpl.substitute({
                'item_name':item['description'], 
                'i':i+1, 
                'event_name':data['parent_event_name']
                # 'event_name':babel.numbers.format_currency(int(item['amount_total'])/100, "GBP", locale='en_UK')
            })
            total_amount += int(item['amount_total'])
    
    with open("./send_email/ticket_body.html", "r") as body_file:
        body_tmpl = Template(body_file.read())
        subdomain = "www" if stage_name == "prod" else stage_name

        if total_amount > 0:
            amount_total = babel.numbers.format_currency(int(total_amount)/100, "GBP", locale='en_UK')
        elif data['is_prebook']:
            amount_total = "Pay Later"
        elif total_amount == 0 and not data['is_prebook']:
            amount_total = "FREE"

        body = body_tmpl.substitute({
            'full_name':data['name'], 
            'personal_info_1':data['email'], 
            'amount_total': amount_total,
            'payment_method_type': "Pre-booking only" if data['is_prebook'] else "",
            'payment_method_2': "Save £2 on the door" if data['is_prebook'] else "",
            'ticket_row':rows, 
            'ticket_number': data['ticket_number'],
            'additional_message': "With this ticket you must pay the remaning balance on the door." if data['is_prebook'] else "",
        })   
    return body

def generate_meal_upgrade_ticket_body(data):
    rows = ""
    total_amount = 0
    # generate table of items purchased
    for i in data['line_items']:
        with open("./send_email/ticket_row.html", 'r') as line_item_row_file:
            line_item_tmpl = Template(line_item_row_file.read())
            rows = rows+"\n"+line_item_tmpl.substitute({
                'tickettype':i['description'], 
                'qty':1, 
                'price':babel.numbers.format_currency(int(i['amount_total'])/100, "GBP", locale='en_UK')
            })
            total_amount += int(i['amount_total'])
    # create total row
    with open("./send_email/ticket_row.html", 'r') as total_row_file:
        total_tmpl = Template(total_row_file.read())
        total_row = total_tmpl.substitute({
            'tickettype':"", 
            'qty':"<strong>Total</strong>", 
            'price':"<strong>"+babel.numbers.format_currency(total_amount/100, "GBP", locale='en_UK')+"</strong>"
        })
    
    with open("./send_email/meal_upgrade_ticket_body.html", "r") as body_file:
        body_tmpl = Template(body_file.read())
        subdomain = "www" if stage_name == "prod" else stage_name
        body = body_tmpl.substitute({
            'fullname':data['name'], 
            'email':data['email'], 
            'ticketnumber':data['ticket_number'], 
            'rows':rows, 
            'ticket_link':"http://{}.merseysidelatinfestival.co.uk/preferences?email={}&ticket_number={}".format(subdomain,data['email'], data['ticket_number']), 
            'total_row':total_row,
            'heading_message':data['heading_message'],
            'upgrade_link': data.get('meal_link', ''),
        })   
    return body

def gen_ticket_qr(ticket_number):
    logger.info("Generating a standard ticket email")
    # generate qr code
    logger.info("Create QR code")
    qr_ticket = qrcode.make(ticket_number, box_size=8, version=3)
    qr_byte_arr = io.BytesIO()
    qr_ticket.save(qr_byte_arr)
    qr_byte_arr = qr_byte_arr.getvalue()
    encoded = base64.b64encode(qr_byte_arr).decode()
    return encoded

def lambda_handler(event, context):
    
    try:
        event = parse_event(event)
        event = validate_event(event, ['email_type'])

    except (ValueError, TypeError, KeyError) as e:
        logger.error("Event validation failed: %s", str(e))
        logger.error(event)
        return {
            'statusCode': 400,
            'body': f'Invalid input: {str(e)}'
        }
    
    if event['email_type'] == "standard_ticket":
        #! check has the expected information in event
        qr_ticket = gen_ticket_qr(event['ticket_number'])

        logger.info("Generate the body of the email")
        body = generate_standard_ticket_body(event)
        subject = 'Rebel SBK Events Ticket Confirmation'
    elif event['email_type'] == "transfer_ticket":
        #! check has the expected information in event
        # generate as usual the ticket body
        qr_ticket = gen_ticket_qr(event['ticket_number'])

        logger.info("Generate the body of the email")
        body = generate_standard_ticket_body(event)

        # append transfer details at bottom of body
        with open("./send_email/ticket_transfer.html", "r") as transfer_file:
            logger.info("Insert the body of the email into header and footer")
            transfer_tmpl = Template(transfer_file.read())
            transfer_content = transfer_tmpl.substitute({
                'oldname': event['full_name_from'],
                'oldemail': event['email_from']
                })

        body += transfer_content
        subject = 'Merseyside Latin Festival Ticket Transfer'
    elif event['email_type'] == "group_rec":
        body = group_rec(event)

        subject = "Merseyside Latin Festival Group Recommendation"
        qr_ticket = None
    elif event['email_type'] == "meal_reminder":
        if 'subject' in event:
            subject = event['subject']
        else:
            subject = "MLF - Choose Your Meal"

        deadline_date = "2nd November"
        with open("./send_email/meal_body.html", "r") as body_file:
            body_tmpl = Template(body_file.read())
            subdomain = "www" if stage_name == "prod" else stage_name
            body = body_tmpl.substitute({
                'deadline_date':deadline_date, 
                'ticket_link':"http://{}.merseysidelatinfestival.co.uk/preferences?email={}&ticket_number={}".format(subdomain, event['email'], event['ticket_number']), 
            })
            qr_ticket = None
    elif event['email_type'] == "basic_message":
        body        = event['message_body']
        subject     = event['subject']
        qr_ticket  = None

    elif event['email_type'] == "ticket_upgrade_notification":

        subject = "Merseyside Latin Festival - Ticket Upgrade Confirmation"
        subdomain = "www" if stage_name == "prod" else stage_name
        manage_ticket_link = "http://{}.merseysidelatinfestival.co.uk/preferences?email={}&ticket_number={}".format(subdomain, event['email'], event['ticket_number'])
        
        upgrade_details = "Your ticket has been upgraded to include: {}".format(event['upgrade_details'].replace("_", " "))

        with open("./send_email/upgrade_notification.html", "r") as body_file:
            body_tmpl = Template(body_file.read())
            subdomain = "www" if stage_name == "prod" else stage_name
            body = body_tmpl.substitute({
                'upgrade_details': upgrade_details, 
                'ticket_link':manage_ticket_link, 
            })
            qr_ticket = None
    elif event['email_type'] == "meal_upgrade_ticket":
        qr_ticket = gen_ticket_qr(event['ticket_number'])

        logger.info("Generate the body of the email")
        body = generate_meal_upgrade_ticket_body(event)
        subject = 'Your Pass - Merseyside Latin Festival'            
    else:
        return False

    # put body in with header
    with open("./send_email/header_footer.html", "r") as header_footer_file:
        logger.info("Insert the body of the email into header and footer")
        header_footer_tmpl = Template(header_footer_file.read())
        html_content = header_footer_tmpl.substitute({
            'type_of_ticket': "booking" if event['is_prebook'] else "purchase",
            'body':body,
            'event_name':event.get('parent_event_name', "this event.")
            })

    to_email = event['email']
    
    if stage_name == "preview":
        return send_email_preview(from_email, to_email, subject, html_content, qr_ticket)
    else:
        return send_email_sendgrid(from_email, to_email, subject, html_content, qr_ticket)