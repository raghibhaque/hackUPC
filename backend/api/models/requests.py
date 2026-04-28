"""API request models."""

from pydantic import BaseModel, Field
from typing import Optional

_SIMPLE_SOURCE = "CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(255) NOT NULL, created_at TIMESTAMP);"
_SIMPLE_TARGET = "CREATE TABLE accounts (account_id INT PRIMARY KEY, email_address VARCHAR(255) NOT NULL, registered_at TIMESTAMP);"


class ReconcileRequest(BaseModel):
    source_sql: str
    target_sql: str
    source_name: Optional[str] = "source"
    target_name: Optional[str] = "target"
    min_confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description=(
            "If set, table mappings whose combined confidence score falls below this threshold "
            "are excluded from table_mappings and their source/target tables are added to "
            "unmatched_source_tables / unmatched_target_tables instead."
        ),
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "summary": "Simple rename reconciliation",
                    "value": {
                        "source_sql": _SIMPLE_SOURCE,
                        "target_sql": _SIMPLE_TARGET,
                        "source_name": "legacy_db",
                        "target_name": "modern_db",
                    },
                },
                {
                    "summary": "Multi-table e-commerce migration",
                    "value": {
                        "source_sql": (
                            "CREATE TABLE orders (id INT PRIMARY KEY, user_id INT, total DECIMAL(10,2), status VARCHAR(20));\n"
                            "CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2), qty INT);"
                        ),
                        "target_sql": (
                            "CREATE TABLE purchase_orders (order_id INT PRIMARY KEY, account_id INT, subtotal DECIMAL(12,2), order_status VARCHAR(30));\n"
                            "CREATE TABLE product_catalog (product_id INT PRIMARY KEY, product_name VARCHAR(255), list_price DECIMAL(12,2), inventory_count INT);"
                        ),
                        "source_name": "v1_shop",
                        "target_name": "v2_shop",
                    },
                },
            ]
        }
    }


class ReconcileFromFilesRequest(BaseModel):
    source_filename: str
    target_filename: str
    source_name: Optional[str] = "source"
    target_name: Optional[str] = "target"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "summary": "Reconcile uploaded files",
                    "value": {
                        "source_filename": "legacy_schema.sql",
                        "target_filename": "modern_schema.sql",
                        "source_name": "legacy",
                        "target_name": "modern",
                    },
                }
            ]
        }
    }


class DemoRequest(BaseModel):
    """Use built-in Ghost + WordPress schemas."""
    source_name: str = "ghost"
    target_name: str = "wordpress"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"summary": "Default Ghost→WordPress demo", "value": {"source_name": "ghost", "target_name": "wordpress"}}
            ]
        }
    }


class MessyDemoRequest(BaseModel):
    """Use built-in messy legacy vs modern e-commerce schemas."""
    source_name: str = "legacy_shop"
    target_name: str = "modern_shop"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"summary": "Abbreviated legacy vs verbose modern", "value": {"source_name": "legacy_shop", "target_name": "modern_shop"}}
            ]
        }
    }


class CRMDemoRequest(BaseModel):
    """Use built-in Salesforce-style legacy vs HubSpot-style modern CRM schemas."""
    source_name: str = "salesforce"
    target_name: str = "hubspot"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"summary": "Salesforce legacy vs HubSpot modern CRM", "value": {"source_name": "salesforce", "target_name": "hubspot"}}
            ]
        }
    }