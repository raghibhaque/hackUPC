"""API response models."""

from pydantic import BaseModel
from typing import Optional, Any


class UploadResponse(BaseModel):
    filename: str
    tables_found: int
    table_names: list[str]
    schema_preview: dict


class DetectUploadResponse(BaseModel):
    filename: str
    detected_format: str
    tables_found: int
    table_names: list[str]
    total_columns: int
    total_foreign_keys: int
    schema_preview: dict


class ReconcileResponse(BaseModel):
    status: str
    job_id: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None


class ExportResponse(BaseModel):
    sql: str
    filename: str


class JobSubmitResponse(BaseModel):
    job_id: str
    status: str = "pending"


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    step: str
    progress: float
    result: Optional[Any] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str