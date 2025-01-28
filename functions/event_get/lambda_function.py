import json
import logging
import os
import inflection

import boto3
from boto3.dynamodb.conditions import Key, Attr
from shared.DecimalEncoder import DecimalEncoder

# ENV
TABLE_NAME = os.environ.get("EVENT_TABLE_NAME")

# Logger configuration
logger = logging.getLogger()
logger.setLevel("INFO")

# AWS resources
db = boto3.resource("dynamodb")
table = db.Table(TABLE_NAME)

def get_all_events():
    """
    Fetches a list of events.
    """
    try:
        logger.info("Fetching list of events...")
        response = table.scan(
            FilterExpression=Attr("PK").begins_with("EVENT#") & Attr("SK").begins_with("EVENT#")
        )
        events = response.get("Items", [])
        logger.info("Events fetched successfully.")
        return events
    except Exception as e:
        logger.error("Error fetching events: %s", str(e))
        raise

def get_event_details(event_slug):
    """

    """
    try:
        logger.info("Fetching event details for slug: %s", event_slug)

        # Query for all items related to the event
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"EVENT#{event_slug}") & Key("SK").lt("T")
        )
        items = response.get("Items", [])
        logger.debug("Items from dynamoDB: %s", json.dumps(items, indent=2, cls=DecimalEncoder))
        if not items:
            logger.warning("No details found for event with slug: %s", event_slug)
            return None

                # Initialize event structure
        items_by_sk = {item["SK"]: item for item in items}
        logger.debug("The items by SK before del: %s", json.dumps(items_by_sk, indent=2, cls=DecimalEncoder))
        event = {"event": items_by_sk.get(f"EVENT#{event_slug}", {})}
        logger.debug("The main event object: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        del items_by_sk[f"EVENT#{event_slug}"]
        logger.debug("The items by SK after del: %s", json.dumps(items_by_sk, indent=2, cls=DecimalEncoder))

        # Categorize items and assign to parents or main event
        for sk, item in items_by_sk.items():
            logger.debug("Processing item: %s", json.dumps(item, indent=2, cls=DecimalEncoder))

            # Determine the type and the pluralized child key
            item_type = inflection.underscore(item.get("type", "unknown"))  # Default to "unknown" if type is missing
            child_key = inflection.pluralize(item_type)  # Get plural form for list key
            logger.debug("Item type: %s, Child key: %s", item_type, child_key)

            # Determine if the item belongs to a parent
            parent_sk = next((parent_sk for parent_sk in items_by_sk if sk.startswith(parent_sk) and sk != parent_sk), None)
            logger.debug("Parent SK for item: %s is %s", sk, parent_sk)

            if parent_sk:
                # Add to the parent's type-specific list
                parent = items_by_sk[parent_sk]
                logger.debug("Parent object before assignment: %s", json.dumps(parent, indent=2, cls=DecimalEncoder))

                if child_key not in parent:
                    parent[child_key] = []
                parent[child_key].append(item)

                logger.debug("Parent object after assignment: %s", json.dumps(parent, indent=2, cls=DecimalEncoder))
            else:
                # Add to the main event
                if child_key not in event["event"]:
                    event["event"][child_key] = []
                event["event"][child_key].append(item)

                logger.debug("Main event after adding child: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

        logger.info("Event details structured successfully for slug: %s", event_slug)
        logger.debug("The final event object: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

        return event

    except Exception as e:
        logger.error("Error fetching event details for slug %s: %s", event_slug, str(e))
        raise

def lambda_handler(event, context):
    """

    """
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2))

        # Determine the operation type from the query string or body
        operation = event.get("queryStringParameters", {}).get("operation")
        if not operation:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Operation type is required in query parameters."}),
            }

        if operation == "get_all":
            # Fetch brief list of events
            events = get_all_events()
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Events retrieved successfully.", "events": events}, cls=DecimalEncoder),
            }

        elif operation == "get_event":
            # Fetch event details for a specific slug
            event_slug = event.get("queryStringParameters", {}).get("event_slug")
            if not event_slug:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"message": "Event slug is required for this operation."}),
                }
            details = get_event_details(event_slug)
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Event details retrieved successfully.", "object": details}, cls=DecimalEncoder),
            }

        else:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Invalid operation type provided."}),
            }

    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal server error."}),
        }
