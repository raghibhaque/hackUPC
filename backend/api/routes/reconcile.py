"""
Reconcile route — runs the full reconciliation pipeline.
"""

import re

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from backend.api.errors import ErrorCode, api_error
from backend.api.models.requests import ReconcileRequest, DemoRequest
from backend.api.models.responses import ReconcileResponse, JobSubmitResponse, JobStatusResponse
from backend.core.parsers.sql_ddl import SQLDDLParser
from backend.core.parsers.prisma import PrismaParser
from backend.core.parsers.json_schema import JSONSchemaParser
from backend.core.parsers.base import BaseParser
from backend.core.reconciliation.engine import ReconciliationEngine
from backend.config import DEMO_DIR, UPLOAD_DIR
from backend.services.pipeline import create_job, get_job, run_reconciliation_job, stream_reconciliation

router = APIRouter(prefix="/reconcile", tags=["reconcile"])
_sql_parser = SQLDDLParser()
_prisma_parser = PrismaParser()
_json_parser = JSONSchemaParser()
parser = _sql_parser  # used by raw-SQL endpoints
engine = ReconciliationEngine()


def _detect_parser(text: str) -> BaseParser:
    if _sql_parser.can_parse(text):
        return _sql_parser
    if _prisma_parser.can_parse(text):
        return _prisma_parser
    if _json_parser.can_parse(text):
        return _json_parser
    raise api_error(
        400,
        ErrorCode.UNSUPPORTED_FORMAT,
        "Could not detect schema format",
        detail={"supported": ["sql_ddl", "prisma", "json_schema"]},
    )


def _strip_ext(filename: str) -> str:
    return re.sub(r"\.(sql|prisma|json)$", "", filename).replace("_schema", "")


# ── Sync endpoints ───────────────────────────────────────────────────────────

@router.post("/demo", response_model=ReconcileResponse)
async def reconcile_demo(req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        raise api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source_schema = parser.parse(ghost_path.read_text(), schema_name=req.source_name)
    target_schema = parser.parse(wp_path.read_text(), schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)
    return ReconcileResponse(status="complete", result=result.to_dict())


@router.post("/", response_model=ReconcileResponse)
async def reconcile_raw(req: ReconcileRequest):
    if not parser.can_parse(req.source_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements")
    if not parser.can_parse(req.target_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements")

    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)
    return ReconcileResponse(status="complete", result=result.to_dict())


@router.post("/files", response_model=ReconcileResponse)
async def reconcile_files(source_file: str, target_file: str):
    source_path = UPLOAD_DIR / source_file
    target_path = UPLOAD_DIR / target_file
    if not source_path.exists():
        raise api_error(404, ErrorCode.NOT_FOUND, f"Source file not found: {source_file}")
    if not target_path.exists():
        raise api_error(404, ErrorCode.NOT_FOUND, f"Target file not found: {target_file}")

    source_text = source_path.read_text()
    target_text = target_path.read_text()
    source_schema = _detect_parser(source_text).parse(source_text, schema_name=_strip_ext(source_file))
    target_schema = _detect_parser(target_text).parse(target_text, schema_name=_strip_ext(target_file))
    result = engine.reconcile(source_schema, target_schema)
    return ReconcileResponse(status="complete", result=result.to_dict())


@router.post("/demo/stats")
async def reconcile_demo_stats(req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        raise api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source_schema = parser.parse(ghost_path.read_text(), schema_name=req.source_name)
    target_schema = parser.parse(wp_path.read_text(), schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)

    high   = [tm for tm in result.table_mappings if tm.combined_score >= 0.8]
    medium = [tm for tm in result.table_mappings if 0.5 <= tm.combined_score < 0.8]
    low    = [tm for tm in result.table_mappings if tm.combined_score < 0.5]

    type_c     = [c for c in result.conflicts if c.conflict_type == "type_mismatch"]
    nullable_c = [c for c in result.conflicts if c.conflict_type == "nullable_mismatch"]
    length_c   = [c for c in result.conflicts if c.conflict_type == "length_mismatch"]

    return {
        "status": "complete",
        "elapsed_seconds": result.elapsed_seconds,
        "source": source_schema.to_dict(),
        "target": target_schema.to_dict(),
        "summary": result.summary,
        "confidence_breakdown": {"high": len(high), "medium": len(medium), "low": len(low)},
        "conflict_breakdown": {
            "type_mismatch":     len(type_c),
            "nullable_mismatch": len(nullable_c),
            "length_mismatch":   len(length_c),
            "other": len(result.conflicts) - len(type_c) - len(nullable_c) - len(length_c),
        },
        "source_stats": {
            "tables": len(source_schema.tables),
            "total_columns": sum(len(t.columns) for t in source_schema.tables),
            "total_foreign_keys": sum(len(t.foreign_keys) for t in source_schema.tables),
        },
        "target_stats": {
            "tables": len(target_schema.tables),
            "total_columns": sum(len(t.columns) for t in target_schema.tables),
            "total_foreign_keys": sum(len(t.foreign_keys) for t in target_schema.tables),
        },
    }


# ── Async job endpoints ───────────────────────────────────────────────────────

@router.post("/async", response_model=JobSubmitResponse)
async def reconcile_async(req: ReconcileRequest, background_tasks: BackgroundTasks):
    if not parser.can_parse(req.source_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements")
    if not parser.can_parse(req.target_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements")

    source = parser.parse(req.source_sql, schema_name=req.source_name)
    target = parser.parse(req.target_sql, schema_name=req.target_name)
    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.post("/async/demo", response_model=JobSubmitResponse)
async def reconcile_async_demo(background_tasks: BackgroundTasks, req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        raise api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name=req.source_name)
    target = parser.parse(wp_path.read_text(), schema_name=req.target_name)
    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.post("/async/files", response_model=JobSubmitResponse)
async def reconcile_async_files(source_file: str, target_file: str, background_tasks: BackgroundTasks):
    source_path = UPLOAD_DIR / source_file
    target_path = UPLOAD_DIR / target_file
    if not source_path.exists():
        raise api_error(404, ErrorCode.NOT_FOUND, f"Source file not found: {source_file}")
    if not target_path.exists():
        raise api_error(404, ErrorCode.NOT_FOUND, f"Target file not found: {target_file}")

    source_text = source_path.read_text()
    target_text = target_path.read_text()
    source = _detect_parser(source_text).parse(source_text, schema_name=_strip_ext(source_file))
    target = _detect_parser(target_text).parse(target_text, schema_name=_strip_ext(target_file))
    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise api_error(404, ErrorCode.NOT_FOUND, f"Job not found: {job_id}")
    return JobStatusResponse(**job.to_dict())


# ── SSE stream endpoints ──────────────────────────────────────────────────────
# Each endpoint returns a text/event-stream response with progress events:
#   data: {"type": "progress", "progress": 0.25, "step": "assigning tables"}
#   data: {"type": "complete", "progress": 1.0, "step": "complete", "result": {...}}
#   data: {"type": "error", "error": "..."}

_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


@router.post("/stream")
async def reconcile_stream(req: ReconcileRequest):
    if not parser.can_parse(req.source_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements")
    if not parser.can_parse(req.target_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements")

    source = parser.parse(req.source_sql, schema_name=req.source_name)
    target = parser.parse(req.target_sql, schema_name=req.target_name)
    return StreamingResponse(stream_reconciliation(source, target), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/stream/demo")
async def reconcile_stream_demo(req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        raise api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name=req.source_name)
    target = parser.parse(wp_path.read_text(), schema_name=req.target_name)
    return StreamingResponse(stream_reconciliation(source, target), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/stream/files")
async def reconcile_stream_files(source_file: str, target_file: str):
    source_path = UPLOAD_DIR / source_file
    target_path = UPLOAD_DIR / target_file
    if not source_path.exists():
        raise api_error(404, ErrorCode.NOT_FOUND, f"Source file not found: {source_file}")
    if not target_path.exists():
        raise api_error(404, ErrorCode.NOT_FOUND, f"Target file not found: {target_file}")

    source_text = source_path.read_text()
    target_text = target_path.read_text()
    source = _detect_parser(source_text).parse(source_text, schema_name=_strip_ext(source_file))
    target = _detect_parser(target_text).parse(target_text, schema_name=_strip_ext(target_file))
    return StreamingResponse(stream_reconciliation(source, target), media_type="text/event-stream", headers=_SSE_HEADERS)
