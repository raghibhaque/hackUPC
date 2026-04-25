"""Upload route — accepts SQL/Prisma/JSON Schema files and returns parsed schema preview."""

import re
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File
from backend.api.errors import ErrorCode, api_error
from backend.api.models.responses import UploadResponse
from backend.core.parsers.sql_ddl import SQLDDLParser
from backend.core.parsers.prisma import PrismaParser
from backend.core.parsers.json_schema import JSONSchemaParser
from backend.config import UPLOAD_DIR, MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS

router = APIRouter(prefix="/upload", tags=["upload"])
_sql_parser = SQLDDLParser()
_prisma_parser = PrismaParser()
_json_parser = JSONSchemaParser()
parser = _sql_parser  # default for the typed /upload/ endpoint


def _safe_filename(raw: str) -> str:
    """Sanitize an uploaded filename and prefix it with a UUID to prevent collisions."""
    name = Path(raw.replace("\\", "/")).name
    name = re.sub(r"[\x00/\\]", "", name)
    if not name:
        raise api_error(400, ErrorCode.VALIDATION_ERROR, "Invalid filename")
    suffix = Path(name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise api_error(
            400,
            ErrorCode.UNSUPPORTED_FORMAT,
            f"File type '{suffix}' not allowed",
            detail={"allowed": sorted(ALLOWED_EXTENSIONS)},
        )
    return f"{uuid.uuid4().hex[:8]}_{name}"


async def _read_bounded(file: UploadFile) -> bytes:
    """Read up to MAX_UPLOAD_BYTES; reject anything larger."""
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise api_error(
            413,
            ErrorCode.FILE_TOO_LARGE,
            f"File too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)",
        )
    return content


def _decode_utf8(content: bytes) -> str:
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        raise api_error(400, ErrorCode.VALIDATION_ERROR, "File must be valid UTF-8 text")


@router.post("/", response_model=UploadResponse)
async def upload_schema(file: UploadFile = File(...)):
    if not file.filename:
        raise api_error(400, ErrorCode.VALIDATION_ERROR, "No filename provided")

    safe_name = _safe_filename(file.filename)
    content = await _read_bounded(file)
    text = _decode_utf8(content)

    if not parser.can_parse(text):
        raise api_error(
            400,
            ErrorCode.PARSE_ERROR,
            "File does not contain valid SQL DDL (no CREATE TABLE found)",
        )

    save_path = UPLOAD_DIR / safe_name
    save_path.write_text(text, encoding="utf-8")

    schema_name = Path(file.filename).stem.replace("_schema", "")
    schema = parser.parse(text, schema_name=schema_name)

    return UploadResponse(
        filename=safe_name,
        tables_found=len(schema.tables),
        table_names=schema.table_names,
        schema_preview=schema.to_dict(),
    )


@router.post("/detect")
async def detect_and_parse(file: UploadFile = File(...)):
    """Auto-detect schema format, parse, and return preview."""
    if not file.filename:
        raise api_error(400, ErrorCode.VALIDATION_ERROR, "No filename provided")

    safe_name = _safe_filename(file.filename)
    content = await _read_bounded(file)
    text = _decode_utf8(content)

    active_parser = None
    detected_format = "unknown"

    if _sql_parser.can_parse(text):
        detected_format = "sql_ddl"
        active_parser = _sql_parser
    elif _prisma_parser.can_parse(text):
        detected_format = "prisma"
        active_parser = _prisma_parser
    elif _json_parser.can_parse(text):
        detected_format = "json_schema"
        active_parser = _json_parser

    if active_parser is None:
        raise api_error(
            400,
            ErrorCode.UNSUPPORTED_FORMAT,
            "Could not detect schema format",
            detail={"supported": ["sql_ddl", "prisma", "json_schema"]},
        )

    save_path = UPLOAD_DIR / safe_name
    save_path.write_text(text, encoding="utf-8")

    schema_name = Path(file.filename).stem.replace("_schema", "")
    schema = active_parser.parse(text, schema_name=schema_name)

    return {
        "filename": safe_name,
        "detected_format": detected_format,
        "tables_found": len(schema.tables),
        "table_names": schema.table_names,
        "total_columns": sum(len(t.columns) for t in schema.tables),
        "total_foreign_keys": sum(len(t.foreign_keys) for t in schema.tables),
        "schema_preview": schema.to_dict(),
    }
