"""
Structured API errors — consistent error envelope across all endpoints.

Every error response has this shape:
    {
        "error":   "<machine-readable code>",
        "message": "<human-readable description>",
        "detail":  <optional extra context, null when absent>
    }

Usage in route handlers:
    raise api_error(404, ErrorCode.NOT_FOUND, f"Job not found: {job_id}")
"""

from enum import Enum
from typing import Any, Optional

from fastapi import HTTPException
from pydantic import BaseModel


class ErrorCode(str, Enum):
    VALIDATION_ERROR   = "validation_error"    # malformed request body / params
    NOT_FOUND          = "not_found"           # resource does not exist
    UNSUPPORTED_FORMAT = "unsupported_format"  # unrecognised / disallowed file type
    FILE_TOO_LARGE     = "file_too_large"      # upload exceeds size limit
    PARSE_ERROR        = "parse_error"         # schema text could not be parsed
    RECONCILIATION_ERROR = "reconciliation_error"  # engine failed unexpectedly
    INTERNAL_ERROR     = "internal_error"      # unhandled server-side exception
    SERVICE_UNAVAILABLE = "service_unavailable"  # dependency not ready


class ErrorResponse(BaseModel):
    error: str       # ErrorCode value — str so OpenAPI renders it as a plain string
    message: str
    detail: Optional[Any] = None


def api_error(
    status_code: int,
    code: ErrorCode,
    message: str,
    detail: Any = None,
) -> HTTPException:
    """Build an HTTPException whose detail is the standard ErrorResponse dict."""
    return HTTPException(
        status_code=status_code,
        detail={"error": code.value, "message": message, "detail": detail},
    )
