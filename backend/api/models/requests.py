"""API request models."""

from pydantic import BaseModel
from typing import Optional


class ReconcileRequest(BaseModel):
    source_sql: str
    target_sql: str
    source_name: Optional[str] = "source"
    target_name: Optional[str] = "target"


class ReconcileFromFilesRequest(BaseModel):
    source_filename: str
    target_filename: str
    source_name: Optional[str] = "source"
    target_name: Optional[str] = "target"


class DemoRequest(BaseModel):
    """Use built-in Ghost + WordPress schemas."""
    source_name: str = "ghost"
    target_name: str = "wordpress"