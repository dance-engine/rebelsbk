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
    Generates a slug based on the name
    """
    base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.strip().lower()).strip('-')
    return f"{base_slug}"


def create_passes(data):
    """
    Creates one or more passes and associates items with each pass.
    """
    try:
        parent_event = data.get("parent_event")
        passes = data.get("passes", [])
        if not parent_event or not passes:
            raise ValueError("parent_event and a list of passes are required.")

        created_passes = []
        for pass_data in passes:
            # Validate the pass attributes
            validate_event(pass_data, ["name"])

            # Generate a slug for the pass
            slug = generate_slug(pass_data["name"])

            # Prepare the DynamoDB pass item
            current_time = int(time.time())
            pass_item = {
                "PK": f"EVENT#{parent_event}",
                "SK": f"EVENT#{parent_event}#PASS#{slug}",
                "slug": slug,
                "name": pass_data["name"],
                "description": pass_data.get("description", ""),
                "current_price": pass_data.get("current_price"),
                "active": pass_data.get("current_price", False) and pass_data.get("active", False),
                "tags": pass_data.get("tags", []),
                "created_at": current_time,
                "updated_at": current_time,
                "type": "pass",
                "organisation":     "rebel-sbk-events",
                "price_id": pass_data.get("price_id", None),
                "saving": pass_data.get("saving", 0)
            }

            # Write the pass to DynamoDB
            table.put_item(
                Item=pass_item,
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)"
            )
            created_passes.append(pass_item)

            # Handle associated items
            associated_items = pass_data.get("associated_items", [])
            for item in associated_items:
                pass_item_mapping = {
                    "PK": f"EVENT#{parent_event}",
                    "SK": f"EVENT#{parent_event}#PASS#{slug}#ITEM#{item}",
                    "pass": f"EVENT#{parent_event}#PASS#{slug}",
                    "item": f"EVENT#{parent_event}#ITEM#{item}",
                    "type": "pass-item",
                    "organisation": "rebel-sbk-events",
                }
                table.put_item(
                    Item=pass_item_mapping,
                    ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)"
                )

        return created_passes

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        raise
    except boto3.exceptions.Boto3Error as e:
        logger.error("DynamoDB error while creating passes: %s", str(e))
        raise Exception("Failed to create passes.")
    except Exception as e:
        logger.error("Unexpected error while creating passes: %s", str(e))
        raise


def get_passes(event_slug=None):
    """
    Retrieves passes for a specific event or all events if no event_slug is provided.
    """
    try:
        if event_slug:
            # Query passes for a specific event
            response = table.query(
                KeyConditionExpression=Key("PK").eq(f"EVENT#{event_slug}") & Key("SK").begins_with(f"EVENT#{event_slug}#PASS#")
            )
        else:
            # Query all passes across all events using the type index
            response = table.query(
                IndexName="type-index",
                KeyConditionExpression=Key("type").eq("pass")
            )

        items = response.get("Items", [])
        passes = []

        # Structure the passes with their associated items
        passes_dict = {}
        for item in items:
            if item["type"] == "pass":
                # Initialize the pass object
                passes_dict[item["SK"]] = {
                    **item,
                    "associated_items": []
                }
            elif item["type"] == "pass-item" and item["pass"] in passes_dict:
                # Add the associated item to the pass
                passes_dict[item["pass"]]["associated_items"].append(item["item"])

        # Collect all the structured passes
        passes = list(passes_dict.values())

        return passes

    except boto3.exceptions.Boto3Error as e:
        logger.error("DynamoDB error while retrieving passes: %s", str(e))
        raise Exception("Failed to retrieve passes.")
    except Exception as e:
        logger.error("Unexpected error while retrieving passes: %s", str(e))
        raise

def update_passes(parent_event, updates_list):
    """
    Updates passes
    """
    try:
        if not updates_list or not isinstance(updates_list, list):
            raise ValueError("A list of updates is required.")

        updated_passes = []
        current_time = int(time.time())

        for update_request in updates_list:
            slug = update_request.get("slug")
            updates = update_request.get("updates")

            if not slug or not updates:
                raise ValueError("Each update must include a 'slug' and 'updates' dictionary.")

            # Construct update expressions
            pk = f"EVENT#{parent_event}"
            sk = f"PASS#{slug}"

            update_expr_parts = []
            expr_attr_values = {}
            expr_attr_names = {}

            for key, value in updates.items():
                attribute_name = f"#{key}"
                update_expr_parts.append(f"{attribute_name}=:{key}")
                expr_attr_names[attribute_name] = key
                expr_attr_values[f":{key}"] = value

            expr_attr_values[":updated_at"] = current_time
            update_expr_parts.append("#updated_at=:updated_at")
            expr_attr_names["#updated_at"] = "updated_at"

            update_expr = "SET " + ", ".join(update_expr_parts)

            # Update item in DynamoDB
            try:
                table.update_item(
                    Key={"PK": pk, "SK": sk},
                    UpdateExpression=update_expr,
                    ExpressionAttributeValues=expr_attr_values,
                    ExpressionAttributeNames=expr_attr_names,
                    ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)"
                )
                updated_passes.append({"slug": slug, "updated_at": current_time})
            except table.meta.client.exceptions.ConditionalCheckFailedException:
                logger.warning("Pass does not exist: %s", slug)
                raise ValueError(f"Pass with slug '{slug}' does not exist.")

        return updated_passes

    except ValueError as e:
        logger.error("Validation error while updating passes: %s", str(e))
        raise
    except boto3.exceptions.Boto3Error as e:
        logger.error("DynamoDB error while updating passes: %s", str(e))
        raise Exception("Failed to update passes.")
    except Exception as e:
        logger.error("Unexpected error while updating passes: %s", str(e))
        raise


def lambda_handler(event, context):
    """

    """
    try:
        logger.info("Received event: %s", json.dumps(event, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method = event['requestContext']["http"]["method"]

        if http_method == "POST":
            validated_event = validate_event(parsed_event, ["parent_event", "passes"])
            created_passes = create_passes(validated_event)
            return {
                "statusCode": 201,
                "body": json.dumps({"message": "Passes created successfully.", "passes": created_passes}, cls=DecimalEncoder),
            }

        elif http_method == "GET":
            event_slug = event.get("queryStringParameters", {}).get("event")
            passes = get_passes(event_slug)
            return {
                "statusCode": 200,
                "body": json.dumps({"passes": passes}, cls=DecimalEncoder),
            }

        elif http_method == "PUT":
            parent_event = parsed_event.get("parent_event")
            updates_list = parsed_event.get("updates_list")

            if not parent_event or not updates_list:
                raise ValueError("parent_event and updates_list are required.")

            updated_passes = update_passes(parent_event, updates_list)
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Passes updated successfully.", "updated_passes": updated_passes}, cls=DecimalEncoder),
            }

        else:
            return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed."}, cls=DecimalEncoder)}

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        return {"statusCode": 400, "body": json.dumps({"message": "Validation error.", "error": str(e)}, cls=DecimalEncoder)}
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return {"statusCode": 500, "body": json.dumps({"message": "Internal server error.", "error": str(e)}, cls=DecimalEncoder)}
