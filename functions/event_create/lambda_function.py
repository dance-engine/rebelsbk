import json
import logging
import os
import time

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from shared.DecimalEncoder import DecimalEncoder
from shared.parser import parse_event, validate_event

# logging.basicConfig()
# profile_name='DE_ADMIN'
# boto3.setup_default_session(profile_name=profile_name)

# ENV
TABLE_NAME = os.environ.get("EVENT_TABLE_NAME")

# Logger configuration
logger = logging.getLogger()
logger.setLevel("INFO")

# AWS resources
db = boto3.resource("dynamodb")
table = db.Table(TABLE_NAME)

def slugify(name):
    """
    Generates a slug
    """
    return name.lower().replace(" ", "-").replace("_", "-")

def create_event(event_data):
    """
    Creates a new Event
    """
    event_name = event_data.get("name")
    venue      = event_data.get('location').get("venue")
    slug_of_event = slugify(event_name)
    slug_of_venue = slugify(venue)

    current_time = int(time.time())
    event_item = {
        "PK":   f"EVENT#{slug_of_event}",
        "SK":   f"EVENT#{slug_of_event}",
        "slug": f"{slug_of_event}",
        "name": event_name,
        "start_time":       event_data.get("start_time"),
        "end_time":         event_data.get("end_time"),
        "category":         event_data.get("category"),        
        "total_capacity":   event_data.get("total_capacity"),
        "created_at":       current_time,
        "description":      event_data.get("description"),
    }

    # Location item
    location_item = {
        "PK": f"EVENT#{slug_of_event}",
        "SK": f"DETAIL#LOCATION#{slug_of_venue}",
        "slug": f"{slug_of_venue}",
        "venue":    event_data["location"].get("venue"),
        "address":  event_data["location"].get("address"),
        "city":     event_data["location"].get("city"),
        "country":  event_data["location"].get("country"),
        "type":     "location"
    }

    # If longitude and latitude included then add that data too
    if event_data["location"].get("lat") and event_data["location"].get("long"):
        location_item['lat'] = event_data["location"].get("lat")
        location_item['long'] = event_data["location"].get("long")

    try:
        # Write the event item if event name not already exist
        table.put_item(
            Item=event_item,
            ConditionExpression="attribute_not_exists(PK)"
        )
        logger.info("Event created successfully: %s", json.dumps(event_item, indent=2))

        # Write the location item
        table.put_item(Item=location_item)
        logger.info("Location details added successfully: %s", json.dumps(location_item, indent=2))

        return {
            "event": event_item,
            "location": location_item,
        }

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning("Event with the same name already exists: %s", event_name)
            return None
        else:
            logger.error("Error creating event: %s", str(e))
            raise

def lambda_handler(event, context):
    """
    Create Event API

    This API endpoint is used to create a new event. The event details must be provided in the request body as a JSON object.

    Required Parameters:
    --------------------
    - **name**        (str): The name of the event. This must be unique and descriptive (e.g., "Spring Salsa Festival 2025").
    - **start_time**  (int): The start date and time of the event in Unix time format (e.g., "1737936858").
    - **end_time**    (int): The end date and time of the event in Unix time format (e.g., "1737936858").
    - **location**   (dict): A dictionary containing details about the event's location:
        - **venue**     (str): The name of the venue (e.g., "Adelphi Hotel").
        - **address**   (str): The full address of the venue (e.g., "Ranelagh St, Liverpool L3 5UL").
        - **city**      (str): The city where the event is held (e.g., "Liverpool").
        - **country**   (str): The country where the event is held (e.g., "UK").
        - **?lat**    (float): [optional] The latitude of the venue location (e.g., 53.4048).
        - **?long**   (float): [optional] The longitude of the venue location (e.g., -2.9791).
    - **description** (str): A detailed description of the event, including key highlights (e.g., "A one-day festival featuring salsa workshops and social dancing").
    - **category**    (str): The category of the event (e.g., "Dance", "Workshop", "Conference").
    - **total_capacity** (int): The maximum number of attendees (tickets sold) allowed for the event.

    Response:
    ---------
    - **201 Created**:
    - Message: "Event created successfully."
    - Event: The details of the newly created event.
    - Location: The location details of the event.

    - **400 Bad Request**:
    - Message: "Event with this name already exists." (if a duplicate name is detected)
    - Message: "Invalid input: [error details]" (if validation fails)

    - **500 Internal Server Error**:
    - Message: "Internal server error" (if an unexpected error occurs)

    Example Request:
    ----------------
    POST /create-event
    Content-Type: application/json

    {
        "name": "Spring Salsa Festival 2025",
        "start_time": "1737936858",
        "end_time": "1737936858",
        "location": {
            "venue": "Adelphi Hotel",
            "address": "Ranelagh St, Liverpool L3 5UL",
            "city": "Liverpool",
            "country": "UK",
            "latitude": 53.4048,
            "longitude": -2.9791
        },
        "description": "A one-day festival featuring salsa workshops and social dancing.",
        "category": "Congress",
        "total_capacity": 400
    }

    Example Response:
    -----------------
    HTTP/1.1 201 Created
    Content-Type: application/json

    {
        "message": "Event created successfully.",
        "event": {
            "PK": "EVENT#spring-salsa-festival-2025",
            "SK": "EVENT#spring-salsa-festival-2025",
            "slug": "spring-salsa-festival-2025",
            "name": "Spring Salsa Festival 2025",
            "start_time": "1737936858",
            "end_time": "1737936858",
            "category": "Congress",
            "total_capacity": 200,
            "created_at": 1709472000,
            "description": "A one-day festival featuring salsa workshops and social dancing."
        },
        "location": {
            "PK": "EVENT#spring-salsa-festival-2025",
            "SK": "LOCATION#spring-salsa-festival-2025",
            "venue": "Adelphi Hotel",
            "address": "Ranelagh St, Liverpool L3 5UL",
            "city": "Liverpool",
            "country": "UK",
            "latitude": 53.4048,
            "longitude": -2.9791
        }
    }
    """

    try:
        logger.info("Received event: %s", json.dumps(event, indent=2))

        # Parse and validate the input event
        event = parse_event(event)
        event = validate_event(event, ["name", "start_time", "end_time", "location", "description", "category", "total_capacity"])
        
        validate_event(event.get("location"), ["venue", "address", "city", "country"])
            
        # Attempt to create the event
        created_event = create_event(event)

        if created_event is None:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Event with this name already exists."}),
            }

        return {
            "statusCode": 201,
            "body": json.dumps({
                "message": "Event created successfully.",
                "event": created_event
            }, cls=DecimalEncoder),
        }

    except (ValueError, TypeError, KeyError) as e:
        logger.error("Validation or processing error: %s", str(e))
        return {"statusCode": 400, "body": f"Invalid input: {str(e)}"}

    except ClientError as e:
        logger.error("AWS service error: %s", str(e))
        return {"statusCode": 500, "body": "Internal server error"}

    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return {"statusCode": 500, "body": "Internal server error"}