import json
import logging
import os
import time
import re
import uuid
import traceback
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from shared.parser import parse_event, validate_event
from shared.DecimalEncoder import DecimalEncoder
import inflection

# Environment Variables
TABLE_NAME = os.environ.get("EVENT_TABLE_NAME")

# Logger Configuration
logger = logging.getLogger()
logger.setLevel("INFO")

# AWS Resources
db = boto3.resource("dynamodb")
table = db.Table(TABLE_NAME)


def generate_slug(name):
    """
    Generates a slug based on the name
    """
    base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.strip().lower()).strip('-')
    return f"{base_slug}"

def create_event(event_data):
    """
    Creates a new event and its location entry in DynamoDB.
    """
    try:
        event_name  = event_data["name"]
        venue       = event_data["location"]["venue"]

        slug_of_event = generate_slug(event_name)
        slug_of_venue = generate_slug(venue)

        current_time  = int(time.time())

        # Event item
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
            location_item['lat'] = Decimal(event_data["location"].get("lat"))
            location_item['long'] = Decimal(event_data["location"].get("long"))
        logger.info(f"Location item: {location_item}")
        # Insert into DynamoDB with condition to prevent duplicate events
        table.put_item(Item=event_item, ConditionExpression="attribute_not_exists(PK)")
        table.put_item(Item=location_item)


        logger.info("Event created successfully: %s", json.dumps(event_item, indent=2, cls=DecimalEncoder))
        return {"event": event_item, "location": location_item}

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning("Event with this name already exists: %s", event_name)
            return None
        else:
            logger.error("Error creating event: %s", str(e))
            logger.error(traceback.format_exc())
            raise

def get_events(event_slug=None, expand=None):
    """
    Retrieves either all events or a specific event and its related details, structured in a nested format.
    
    If no event_slug is provided, returns a list of events without details.
    If event_slug is provided, retrieves the event and all related data, categorizing and nesting them appropriately.
    """
    try:
        if not event_slug:
            # Scan to retrieve only the top-level event entries (PK = SK)
            response = table.scan(
                FilterExpression=Key("PK").begins_with("EVENT#") & Key("PK").eq(Key("SK"))
            )
            return response.get("Items", [])
        
        if expand and "tickets" in expand:
            key_condition_expression = Key("PK").eq(f"EVENT#{event_slug}")
        else:
            # Exclude TICKET# items from the query
            key_condition_expression = Key("PK").eq(f"EVENT#{event_slug}") & Key("SK").lt("T")

        # Query for all items related to the event
        response = table.query(
            KeyConditionExpression=key_condition_expression
        )
        items = response.get("Items", [])

        if not items:
            return None  # Event not found

        # Organizing the items into a nested structure
        items_by_sk = {item["SK"]: item for item in items}
        event = {"event": items_by_sk.pop(f"EVENT#{event_slug}", {})}

        for item in list(items_by_sk.values()):
            sk = item["SK"]
            item_type = inflection.underscore(item.get("type", ""))  # Convert type to snake_case
            child_key = inflection.pluralize(item_type)  # Get plural form for list key

            # Determine if the item belongs to a parent
            parent_sk = next(
                (parent_sk for parent_sk in items_by_sk if sk.startswith(parent_sk) and sk != parent_sk),
                None
            )

            if parent_sk:
                # Add to the parent's type-specific list
                parent = items_by_sk[parent_sk]
                if child_key not in parent:
                    parent[child_key] = []
                parent[child_key].append(item)
            else:
                # Add to the main event
                if child_key not in event["event"]:
                    event["event"][child_key] = []
                event["event"][child_key].append(item)

        return event

    except ClientError as e:
        logger.error("DynamoDB error while retrieving events: %s", str(e))
        raise Exception("Failed to retrieve events.")

def update_event(event_slug, updates):
    """
    Updates an event's details.
    """
    try:
        pk = f"EVENT#{event_slug}"
        sk = f"EVENT#{event_slug}"
        current_time = int(time.time())

        # Construct update expressions safely
        update_expr_parts = []
        expr_attr_values = {":updated_at": current_time}
        expr_attr_names = {"#updated_at": "updated_at"}

        for key, value in updates.items():
            attribute_name = f"#{key}"
            update_expr_parts.append(f"{attribute_name}=:{key}")
            expr_attr_names[attribute_name] = key
            expr_attr_values[f":{key}"] = value

        update_expr_parts.append("#updated_at=:updated_at")
        update_expr = "SET " + ", ".join(update_expr_parts)

        # Perform update in DynamoDB
        table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_attr_values,
            ExpressionAttributeNames=expr_attr_names,
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)"
        )

        return {"slug": event_slug, "updated_at": current_time}

    except table.meta.client.exceptions.ConditionalCheckFailedException:
        logger.warning("Event does not exist: %s", event_slug)
        raise ValueError(f"Event with slug '{event_slug}' does not exist.")
    except ClientError as e:
        logger.error("DynamoDB error while updating event: %s", str(e))
        raise Exception("Failed to update event.")

def lambda_handler(event, context):
    """
        Events API

        This API endpoint is used to manage events. It supports the following operations:
        - **POST**: Create a new event.
        - **GET**: Retrieve all events or a specific event with nested details.
        - **PUT**: Update an existing event.

        Required Parameters for POST:
        -----------------------------
        - **name**        (str): The name of the event. Must be unique and descriptive (e.g., "Spring Salsa Festival 2025").
        - **start_time**  (int): The start time of the event in Unix timestamp format (e.g., "1737936858").
        - **end_time**    (int): The end time of the event in Unix timestamp format (e.g., "1737936858").
        - **location**   (dict): A dictionary containing details about the event's location:
            - **venue**     (str): The name of the venue (e.g., "Adelphi Hotel").
            - **address**   (str): The full address (e.g., "Ranelagh St, Liverpool L3 5UL").
            - **city**      (str): The city where the event is held (e.g., "Liverpool").
            - **country**   (str): The country where the event is held (e.g., "UK").
            - **?lat**    (float): [optional] Latitude of the venue (e.g., 53.4048).
            - **?long**   (float): [optional] Longitude of the venue (e.g., -2.9791).
        - **description** (str): A detailed description of the event (e.g., "A one-day festival featuring salsa workshops.").
        - **category**    (str): The category of the event (e.g., "Congress").
        - **total_capacity** (int): The maximum number of attendees.

        Required Parameters for GET:
        ----------------------------
        - **?event** (str): [optional] The slug of the event to retrieve details for. If omitted, retrieves all top-level events.
        - **?expand** (list): [optional] Expandable fields to retrieve additional details. Possible values:
            - `"tickets"`: Retrieves ticket information related to the event.

        Required Parameters for PUT:
        ----------------------------
        - **slug**    (str): The slug of the event to update.
        - **updates** (dict): A dictionary of fields to update, such as:
            - **name**, **start_time**, **end_time**, **location**, **description**, **category**, **total_capacity**.

        Response for POST:
        ------------------
        - **201 Created**:
            - Message: "Event created successfully."
            - Event: The details of the newly created event.
            - Location: The location details of the event.

        Response for GET:
        -----------------
        - **200 OK**:
            - **If no event slug is provided:** Returns a list of all events (without details).
            - **If an event slug is provided:** Returns the event and its details (e.g., location, passes, items).
            - **If expand includes `"tickets"`**, ticket details will be included.

        Response for PUT:
        -----------------
        - **200 OK**:
            - Message: "Event updated successfully."
            - Updated_Event: A dictionary containing the updated event details.

        Error Responses:
        ----------------
        - **400 Bad Request**:
            - Message: "Validation error." (if required parameters are missing or invalid).
        - **404 Not Found**:
            - Message: "Event not found." (if the requested event does not exist).
        - **500 Internal Server Error**:
            - Message: "Internal server error." (if an unexpected error occurs).

        Example Request (POST):
        ------------------------
        POST /events
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

        Example Response (POST):
        -------------------------
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

        Example Request (GET):
        -----------------------
        GET /events?event=spring-salsa-festival-2025
        Content-Type: application/json

        Example Response (GET):
        ------------------------
        HTTP/1.1 200 OK
        Content-Type: application/json

        {
            "events": {
                "PK": "EVENT#spring-salsa-festival-2025",
                "SK": "EVENT#spring-salsa-festival-2025",
                "category": "Congress",
                "created_at": 1738013589,
                "description": "A one-day festival featuring salsa workshops and social dancing.",
                "end_time": "1737936858",
                "name": "Spring Salsa Festival 2025",
                "slug": "spring-salsa-festival-2025",
                "start_time": "1737936858",
                "total_capacity": 200,
                "type": "event",
                "location": {
                    "PK": "EVENT#spring-salsa-festival-2025",
                    "SK": "DETAIL#LOCATION#adelphi-hotel",
                    "address": "Ranelagh St, Liverpool L3 5UL",
                    "city": "Liverpool",
                    "country": "UK",
                    "venue": "Adelphi Hotel",
                    "type": "location"
                }
            }
        }

        Example Request (GET with Expansion):
        -------------------------------------
        GET /events?event=spring-salsa-festival-2025&expand=tickets
        Content-Type: application/json

        Example Response (GET with Expansion):
        --------------------------------------
        HTTP/1.1 200 OK
        Content-Type: application/json

        {
            "events": {
                "PK": "EVENT#spring-salsa-festival-2025",
                "SK": "EVENT#spring-salsa-festival-2025",
                "category": "Congress",
                "created_at": 1738013589,
                "description": "A one-day festival featuring salsa workshops and social dancing.",
                "end_time": "1737936858",
                "name": "Spring Salsa Festival 2025",
                "slug": "spring-salsa-festival-2025",
                "start_time": "1737936858",
                "total_capacity": 200,
                "type": "event",
                "tickets": [
                    {
                        "PK": "EVENT#spring-salsa-festival-2025",
                        "SK": "TICKET#123456",
                        "ticket_number": "123456",
                        "email": "user@example.com",
                        "full_name": "John Doe",
                        "status": "active",
                        "purchase_date": "1737936858"
                    }
                ]
            }
        }

        Example Request (PUT):
        -----------------------
        PUT /events
        Content-Type: application/json

        {
            "slug": "spring-salsa-festival-2025",
            "updates": {
                "name": "Updated Spring Salsa Festival",
                "description": "A refreshed event with new performances."
            }
        }

        Example Response (PUT):
        ------------------------
        HTTP/1.1 200 OK
        Content-Type: application/json

        {
            "message": "Event updated successfully.",
            "updated_event": {
                "slug": "spring-salsa-festival-2025",
                "updated_at": 1737936878
            }
        }
    """

    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method = event['requestContext']["http"]["method"]

        if http_method == "POST":
            validated_event = validate_event(parsed_event, ["name", "start_time", "end_time", "location", "total_capacity"])
            validate_event(validated_event["location"], ["venue", "address", "city", "country"])

            created_event = create_event(validated_event)
            if created_event is None:
                return {"statusCode": 400, "body": json.dumps({"message": "Event with this name already exists."})}

            return {"statusCode": 201, "body": json.dumps({"message": "Event created successfully.", "event": created_event}, cls=DecimalEncoder)}

        elif http_method == "GET":
            event_slug = event.get("queryStringParameters", {}).get("event")
            events = get_events(event_slug)
            if events is None:
                return {"statusCode": 404, "body": json.dumps({"message": "Event not found."})}
            return {"statusCode": 200, "body": json.dumps({"events": events}, cls=DecimalEncoder)}

        elif http_method == "PUT":
            event_slug = parsed_event.get("slug")
            updates = parsed_event.get("updates")

            if not event_slug or not updates:
                raise ValueError("slug and updates are required.")

            updated_event = update_event(event_slug, updates)
            return {"statusCode": 200, "body": json.dumps({"message": "Event updated successfully.", "updated_event": updated_event}, cls=DecimalEncoder)}

        else:
            return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed."})}

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 400, "body": json.dumps({"message": "Validation error.", "error": str(e)})}
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 500, "body": json.dumps({"message": "Internal server error.", "error": str(e)})}