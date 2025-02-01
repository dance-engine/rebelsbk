import json
import logging
import os
import time
import re
import uuid
import boto3
from boto3.dynamodb.conditions import Key
from shared.parser import parse_event, validate_event
from shared.DecimalEncoder import DecimalEncoder

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

    """
    base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.strip().lower()).strip('-')
    # unique_suffix = uuid.uuid4().hex[:6]
    return f"{base_slug}"


def create_individual_items(data):
    """
    Creates individual items
    """
    try:
        parent_event = data.get("parent_event")
        items = data.get("items", [])
        if not parent_event or not items:
            raise ValueError("parent_event and a list of items are required.")

        created_items = []
        for item in items:
            # Validate item attributes
            validate_event(item, ["name"])

            # Generate a slug based on the name
            slug = generate_slug(item["name"])

            # Populate the DynamoDB item
            current_time = int(time.time())
            individual_item = {
                "PK": f"EVENT#{parent_event}",
                "SK": f"EVENT#{parent_event}#ITEM#{slug}",
                "slug": slug,
                "name": item["name"],
                "description": item.get("description", ""),
                "current_price": item.get("current_price"),
                "active": item.get("current_price", False) and item.get("active", False),
                "tags": item.get("tags", []),
                "created_at": current_time,
                "updated_at": current_time,
                "type": "individual-item",
                "organisation": "rebel-sbk-events",
                "price_id": item.get("price_id", None)
            }

            # Write the item to DynamoDB
            table.put_item(
                Item=individual_item,
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)"
            )
            created_items.append(individual_item)

        return created_items

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        raise
    except boto3.exceptions.Boto3Error as e:
        logger.error("DynamoDB error while creating items: %s", str(e))
        raise Exception("Failed to create individual items.")
    except Exception as e:
        logger.error("Unexpected error while creating items: %s", str(e))
        raise


def get_individual_items(event_slug=None):
    """
    Retrieves individual items for a specific event or all events if no slug is provided.
    """
    try:
        if event_slug:
            response = table.query(
                KeyConditionExpression=Key("PK").eq(f"EVENT#{event_slug}") & Key("SK").begins_with(f"EVENT#{event_slug}#ITEM#")
            )
        else:
            response = table.query(
                IndexName="type-index",
                KeyConditionExpression=Key("type").eq("individual-item")
            )

        return response.get("Items", [])

    except boto3.exceptions.Boto3Error as e:
        logger.error("DynamoDB error while retrieving items: %s", str(e))
        raise Exception("Failed to retrieve individual items.")
    except Exception as e:
        logger.error("Unexpected error while retrieving items: %s", str(e))
        raise


def update_individual_items(parent_event, updates_list):
    """
    Updates individual items.

    :param parent_event: The event to which the items belong.
    :param updates_list: A list of dictionaries, each containing:
                         - 'slug': The slug of the item to update.
                         - 'updates': A dictionary of the attributes to update.
    :return: A list of updated item details (e.g., slugs and timestamps).
    """
    try:
        if not updates_list or not isinstance(updates_list, list):
            raise ValueError("A list of updates is required.")

        updated_items = []
        current_time = int(time.time())

        for update_request in updates_list:
            slug = update_request.get("slug")
            updates = update_request.get("updates")

            if not slug or not updates:
                raise ValueError("Each update must include a 'slug' and 'updates' dictionary.")

            # Construct update expressions
            pk = f"EVENT#{parent_event}"
            sk = f"ITEM#{slug}"

            update_expr_parts = []
            expr_attr_values = {}
            expr_attr_names = {}

            for key, value in updates.items():
                attribute_name = f"#{key}"
                update_expr_parts.append(f"{attribute_name}=:{key}")
                expr_attr_names[attribute_name] = key  # Map attribute name
                expr_attr_values[f":{key}"] = value

            expr_attr_values[":updated_at"] = current_time
            update_expr_parts.append("#updated_at=:updated_at")
            expr_attr_names["#updated_at"] = "updated_at"

            update_expr = "SET " + ", ".join(update_expr_parts)

            # Update item in DynamoDB with a condition to check existence
            try:
                table.update_item(
                    Key={"PK": pk, "SK": sk},
                    UpdateExpression=update_expr,
                    ExpressionAttributeValues=expr_attr_values,
                    ExpressionAttributeNames=expr_attr_names,
                    ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)"
                )
                updated_items.append({"slug": slug, "updated_at": current_time})
            except table.meta.client.exceptions.ConditionalCheckFailedException:
                logger.warning("Item does not exist: %s", slug)
                raise ValueError(f"Item with slug '{slug}' does not exist.")

        return updated_items

    except ValueError as e:
        logger.error("Validation error while updating items: %s", str(e))
        raise
    except boto3.exceptions.Boto3Error as e:
        logger.error("DynamoDB error while updating items: %s", str(e))
        raise Exception("Failed to update individual items.")
    except Exception as e:
        logger.error("Unexpected error while updating items: %s", str(e))
        raise


def lambda_handler(event, context):
    """
        Individual Items API

        This API endpoint is used to manage individual items associated with an event. It supports the following operations:
        - **POST**: Create one or more individual items.
        - **GET**: Retrieve all individual items for a specific event or all events.
        - **PUT**: Update one or more individual items.

        Required Parameters for POST:
        -----------------------------
        - **parent_event**  (str): The unique slug of the parent event the items belong to (e.g., "spring-salsa-festival-2025").
        - **items**        (list): A list of dictionaries representing individual items. Each dictionary must include:
            - **name**           (str): The name of the item (e.g., "Party").
            - **?description**   (str): [optional] A brief description of the item (e.g., "Access to the evening party only.").
            - **?current_price** (str): [optional] A unique identifier for the current price (e.g., "price_id_1689").
            - **?active**       (bool): [optional] Indicates if the item is active. Defaults to `false` if not set or no price exists.
            - **?tags**         (list): [optional] Tags for categorizing the item (e.g., ["evening", "social"]).

        Required Parameters for GET:
        ----------------------------
        - **?event** (str): [optional] The slug of the event to retrieve items for. If omitted, retrieves all individual items across all events.

        Required Parameters for PUT:
        ----------------------------
        - **parent_event**  (str): The unique slug of the parent event the items belong to (e.g., "spring-salsa-festival-2025").
        - **updates_list** (list): A list of dictionaries representing the updates to be applied. Each dictionary must include:
            - **slug**      (str): The unique slug of the item to update.
            - **updates**  (dict): A dictionary of the attributes to update. Valid keys include:
                - **name**, **description**, **current_price**, **active**, **tags**.

        Response for POST:
        ------------------
        - **201 Created**:
            - Message: "Items created successfully."
            - Items: A list of the newly created items with their attributes.

        Response for GET:
        -----------------
        - **200 OK**:
            - Items: A list of items belonging to the specified event or all events.

        Response for PUT:
        -----------------
        - **200 OK**:
            - Message: "Items updated successfully."
            - Updated_Items: A list of updated item slugs with their updated timestamps.

        Error Responses:
        ----------------
        - **400 Bad Request**:
            - Message: "Validation error." (if required parameters are missing or invalid)
            - Details: Specific validation errors.
        - **500 Internal Server Error**:
            - Message: "Internal server error." (if an unexpected error occurs)

        Example Request (POST):
        ------------------------
        POST /individual-items
        Content-Type: application/json

        {
            "parent_event": "spring-salsa-festival-2025",
            "items": [
                {
                    "name": "Party",
                    "description": "Access to the evening party only.",
                    "current_price": "price_id_1689",
                    "active": true,
                    "tags": ["evening", "social"]
                },
                {
                    "name": "Classes",
                    "current_price": "price_id_1234",
                    "tags": ["beginner", "workshop"]
                }
            ]
        }

        Example Response (POST):
        -------------------------
        HTTP/1.1 201 Created
        Content-Type: application/json

        {
            "message": "Items created successfully.",
            "items": [
                {
                    "PK": "EVENT#spring-salsa-festival-2025",
                    "SK": "ITEM#party",
                    "slug": "party",
                    "name": "Party",
                    "description": "Access to the evening party only.",
                    "current_price": "price_id_1689",
                    "type": "individual-item",
                    "active": true,
                    "tags": ["evening", "social"],
                    "created_at": 1737936858,
                    "updated_at": 1737936858
                },
                {
                    "PK": "EVENT#spring-salsa-festival-2025",
                    "SK": "ITEM#classes",
                    "slug": "classes",
                    "name": "Classes",
                    "description": "",
                    "current_price": "price_id_1234",
                    "type": "individual-item",
                    "active": false,
                    "tags": ["beginner", "workshop"],
                    "created_at": 1737936858,
                    "updated_at": 1737936858
                }
            ]
        }

        Example Request (GET):
        -----------------------
        GET /individual-items?event=spring-salsa-festival-2025
        Content-Type: application/json

        Example Response (GET):
        ------------------------
        HTTP/1.1 200 OK
        Content-Type: application/json

        {
            "items": [
                {
                    "PK": "EVENT#spring-salsa-festival-2025",
                    "SK": "ITEM#party",
                    "slug": "party",
                    "name": "Party",
                    "description": "Access to the evening party only.",
                    "current_price": "price_id_1689",
                    "type": "individual-item",
                    "active": true,
                    "tags": ["evening", "social"],
                    "created_at": 1737936858,
                    "updated_at": 1737936858
                }
            ]
        }

        Example Request (PUT):
        -----------------------
        PUT /individual-items
        Content-Type: application/json

        {
            "parent_event": "spring-salsa-festival-2025",
            "updates_list": [
                {
                    "slug": "party",
                    "updates": {
                        "name": "Updated Party Name",
                        "description": "Updated description for the party.",
                        "current_price": "price_id_9999"
                    }
                }
            ]
        }

        Example Response (PUT):
        ------------------------
        HTTP/1.1 200 OK
        Content-Type: application/json

        {
            "message": "Items updated successfully.",
            "updated_items": [
                {
                    "slug": "party",
                    "updated_at": 1737936878
                }
            ]
        }
    """

    try:
        logger.info("Received event: %s", json.dumps(event, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method = event['requestContext']["http"]["method"]

        if http_method == "POST":
            validated_event = validate_event(parsed_event, ["parent_event", "items"])
            created_items = create_individual_items(validated_event)
            return {
                "statusCode": 201,
                "body": json.dumps({"message": "Items created successfully.", "items": created_items}, cls=DecimalEncoder),
            }

        elif http_method == "GET":
            event_slug = event.get("queryStringParameters", {}).get("event")
            items = get_individual_items(event_slug)
            return {
                "statusCode": 200,
                "body": json.dumps({"items": items}, cls=DecimalEncoder),
            }

        elif http_method == "PUT":
            parent_event = parsed_event.get("parent_event")
            updates_list = parsed_event.get("updates_list")

            if not parent_event or not updates_list:
                raise ValueError("parent_event and updates_list are required.")

            updated_items = update_individual_items(parent_event, updates_list)
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Items updated successfully.", "updated_items": updated_items}, cls=DecimalEncoder),
            }

        else:
            return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed."}, cls=DecimalEncoder)}

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        return {"statusCode": 400, "body": json.dumps({"message": "Validation error.", "error": str(e)}, cls=DecimalEncoder)}
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return {"statusCode": 500, "body": json.dumps({"message": "Internal server error.", "error": str(e)}, cls=DecimalEncoder)}
