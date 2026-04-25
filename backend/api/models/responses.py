"""API response models."""

from pydantic import BaseModel
from typing import Optional, Any


class UploadResponse(BaseModel):
    filename: str
    tables_found: int
    table_names: list[str]
    schema_preview: dict


class ReconcileResponse(BaseModel):
    status: str
    job_id: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None


class ExportResponse(BaseModel):
    sql: str
    filename: str


class HealthResponse(BaseModel):
    status: str
    version: str