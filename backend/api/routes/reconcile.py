"""
Reconcile route — runs the full reconciliation pipeline.
"""

import re

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from backend.api.errors import ErrorCode, ErrorResponse, api_error, ParseErrorDetail, FormatErrorDetail
from backend.api.models.requests import ReconcileRequest, DemoRequest, MessyDemoRequest
from backend.api.models.responses import ReconcileResponse, JobSubmitResponse, JobStatusResponse
from backend.core.parsers.sql_ddl import SQLDDLParser
from backend.core.parsers.prisma import PrismaParser
from backend.core.parsers.json_schema import JSONSchemaParser
from backend.core.parsers.base import BaseParser
from backend.core.reconciliation.engine import ReconciliationEngine
from backend.config import DEMO_DIR, UPLOAD_DIR
from backend.services.pipeline import create_job, get_job, run_reconciliation_job, stream_reconciliation

router = APIRouter(prefix="/reconcile", tags=["reconcile"])

# Shared OpenAPI error response declarations reused across every route.
_ERR = {
    400: {"model": ErrorResponse, "description": "Bad request — parse error, unsupported format, or invalid input"},
    404: {"model": ErrorResponse, "description": "Resource not found"},
    422: {"model": ErrorResponse, "description": "Request validation failed"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}
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
    api_error(
        400,
        ErrorCode.UNSUPPORTED_FORMAT,
        "Could not detect schema format",
        detail=FormatErrorDetail(supported=["sql_ddl", "prisma", "json_schema"]),
    )


def _strip_ext(filename: str) -> str:
    return re.sub(r"\.(sql|prisma|json)$", "", filename).replace("_schema", "")


# ── Sync endpoints ───────────────────────────────────────────────────────────

@router.post("/demo", response_model=ReconcileResponse, responses=_ERR)
async def reconcile_demo(req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source_schema = parser.parse(ghost_path.read_text(), schema_name=req.source_name)
    target_schema = parser.parse(wp_path.read_text(), schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)
    return ReconcileResponse(status="complete", result=result.to_dict())


@router.post("/", response_model=ReconcileResponse, responses=_ERR)
async def reconcile_raw(req: ReconcileRequest):
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the source schema"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the target schema"))

    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)
    return ReconcileResponse(status="complete", result=result.to_dict())


@router.post("/files", response_model=ReconcileResponse, responses=_ERR)
async def reconcile_files(source_file: str, target_file: str):
    source_path = UPLOAD_DIR / source_file
    target_path = UPLOAD_DIR / target_file
    if not source_path.exists():
        api_error(404, ErrorCode.NOT_FOUND, f"Source file not found: {source_file}")
    if not target_path.exists():
        api_error(404, ErrorCode.NOT_FOUND, f"Target file not found: {target_file}")

    source_text = source_path.read_text()
    target_text = target_path.read_text()
    source_schema = _detect_parser(source_text).parse(source_text, schema_name=_strip_ext(source_file))
    target_schema = _detect_parser(target_text).parse(target_text, schema_name=_strip_ext(target_file))
    result = engine.reconcile(source_schema, target_schema)
    return ReconcileResponse(status="complete", result=result.to_dict())


@router.post("/demo/stats", responses=_ERR)
async def reconcile_demo_stats(req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

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

@router.post("/async", response_model=JobSubmitResponse, responses=_ERR)
async def reconcile_async(req: ReconcileRequest, background_tasks: BackgroundTasks):
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the source schema"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the target schema"))

    source = parser.parse(req.source_sql, schema_name=req.source_name)
    target = parser.parse(req.target_sql, schema_name=req.target_name)
    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.post("/async/demo", response_model=JobSubmitResponse, responses=_ERR)
async def reconcile_async_demo(background_tasks: BackgroundTasks, req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name=req.source_name)
    target = parser.parse(wp_path.read_text(), schema_name=req.target_name)
    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.post("/async/files", response_model=JobSubmitResponse, responses=_ERR)
async def reconcile_async_files(source_file: str, target_file: str, background_tasks: BackgroundTasks):
    source_path = UPLOAD_DIR / source_file
    target_path = UPLOAD_DIR / target_file
    if not source_path.exists():
        api_error(404, ErrorCode.NOT_FOUND, f"Source file not found: {source_file}")
    if not target_path.exists():
        api_error(404, ErrorCode.NOT_FOUND, f"Target file not found: {target_file}")

    source_text = source_path.read_text()
    target_text = target_path.read_text()
    source = _detect_parser(source_text).parse(source_text, schema_name=_strip_ext(source_file))
    target = _detect_parser(target_text).parse(target_text, schema_name=_strip_ext(target_file))
    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse, responses=_ERR)
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        api_error(404, ErrorCode.NOT_FOUND, f"Job not found: {job_id}")
    return JobStatusResponse(**job.to_dict())


# ── SSE stream endpoints ──────────────────────────────────────────────────────
# Each endpoint returns a text/event-stream response with progress events:
#   data: {"type": "progress", "progress": 0.25, "step": "assigning tables"}
#   data: {"type": "complete", "progress": 1.0, "step": "complete", "result": {...}}
#   data: {"type": "error", "error": "..."}

_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


@router.post("/stream", responses=_ERR)
async def reconcile_stream(req: ReconcileRequest):
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the source schema"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the target schema"))

    source = parser.parse(req.source_sql, schema_name=req.source_name)
    target = parser.parse(req.target_sql, schema_name=req.target_name)
    return StreamingResponse(stream_reconciliation(source, target), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/stream/demo", responses=_ERR)
async def reconcile_stream_demo(req: DemoRequest = DemoRequest()):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name=req.source_name)
    target = parser.parse(wp_path.read_text(), schema_name=req.target_name)
    return StreamingResponse(stream_reconciliation(source, target), media_type="text/event-stream", headers=_SSE_HEADERS)


# ── Schema comparison stats (any schema pair) ────────────────────────────────

@router.post("/compare/stats", responses=_ERR)
async def compare_stats(req: ReconcileRequest):
    """Full comparison summary for any two schemas — richer than /reconcile/."""
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements",
                  detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the source schema"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements",
                  detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the target schema"))

    source = parser.parse(req.source_sql, schema_name=req.source_name)
    target = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source, target)

    high   = [tm for tm in result.table_mappings if tm.combined_score >= 0.8]
    medium = [tm for tm in result.table_mappings if 0.5 <= tm.combined_score < 0.8]
    low    = [tm for tm in result.table_mappings if tm.combined_score < 0.5]

    errors   = [c for c in result.conflicts if c.severity == "error"]
    warnings = [c for c in result.conflicts if c.severity == "warning"]
    infos    = [c for c in result.conflicts if c.severity == "info"]

    def _schema_stats(schema):
        type_dist: dict[str, int] = {}
        fk_count = 0
        for t in schema.tables:
            for c in t.columns:
                key = c.col_type.value
                type_dist[key] = type_dist.get(key, 0) + 1
            fk_count += len(t.foreign_keys)
        return {
            "tables": len(schema.tables),
            "table_names": schema.table_names,
            "total_columns": sum(len(t.columns) for t in schema.tables),
            "total_foreign_keys": fk_count,
            "type_distribution": type_dist,
        }

    return {
        "status": "complete",
        "elapsed_seconds": result.elapsed_seconds,
        "summary": result.summary,
        "source_stats": _schema_stats(source),
        "target_stats": _schema_stats(target),
        "confidence_breakdown": {
            "high":   [{"source": tm.source_table, "target": tm.target_table, "score": round(tm.combined_score, 4)} for tm in high],
            "medium": [{"source": tm.source_table, "target": tm.target_table, "score": round(tm.combined_score, 4)} for tm in medium],
            "low":    [{"source": tm.source_table, "target": tm.target_table, "score": round(tm.combined_score, 4)} for tm in low],
        },
        "conflict_breakdown": {
            "errors":   len(errors),
            "warnings": len(warnings),
            "infos":    len(infos),
            "by_type": {
                ctype: len([c for c in result.conflicts if c.conflict_type == ctype])
                for ctype in {c.conflict_type for c in result.conflicts}
            },
        },
        "unmatched": {
            "source_tables": result.unmatched_source_tables,
            "target_tables": result.unmatched_target_tables,
        },
    }


# ── Messy demo endpoints (legacy abbreviated vs modern verbose e-commerce) ────

def _messy_schemas(req: MessyDemoRequest):
    legacy_path = DEMO_DIR / "messy_legacy_schema.sql"
    modern_path = DEMO_DIR / "messy_modern_schema.sql"
    if not legacy_path.exists() or not modern_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Messy demo schema files not found")
    source = parser.parse(legacy_path.read_text(), schema_name=req.source_name)
    target = parser.parse(modern_path.read_text(), schema_name=req.target_name)
    return source, target


@router.post("/messy", response_model=ReconcileResponse, responses=_ERR)
async def reconcile_messy(req: MessyDemoRequest = MessyDemoRequest()):
    source, target = _messy_schemas(req)
    result = engine.reconcile(source, target)
    return ReconcileResponse(status="complete", result=result.to_dict())


@router.post("/messy/stats", responses=_ERR)
async def reconcile_messy_stats(req: MessyDemoRequest = MessyDemoRequest()):
    source, target = _messy_schemas(req)
    result = engine.reconcile(source, target)

    high   = [tm for tm in result.table_mappings if tm.combined_score >= 0.8]
    medium = [tm for tm in result.table_mappings if 0.5 <= tm.combined_score < 0.8]
    low    = [tm for tm in result.table_mappings if tm.combined_score < 0.5]

    type_c     = [c for c in result.conflicts if c.conflict_type == "type_mismatch"]
    nullable_c = [c for c in result.conflicts if c.conflict_type == "nullable_mismatch"]
    length_c   = [c for c in result.conflicts if c.conflict_type == "length_mismatch"]

    return {
        "status": "complete",
        "elapsed_seconds": result.elapsed_seconds,
        "source": source.to_dict(),
        "target": target.to_dict(),
        "summary": result.summary,
        "confidence_breakdown": {"high": len(high), "medium": len(medium), "low": len(low)},
        "conflict_breakdown": {
            "type_mismatch":     len(type_c),
            "nullable_mismatch": len(nullable_c),
            "length_mismatch":   len(length_c),
            "other": len(result.conflicts) - len(type_c) - len(nullable_c) - len(length_c),
        },
        "source_stats": {
            "tables": len(source.tables),
            "total_columns": sum(len(t.columns) for t in source.tables),
            "total_foreign_keys": sum(len(t.foreign_keys) for t in source.tables),
        },
        "target_stats": {
            "tables": len(target.tables),
            "total_columns": sum(len(t.columns) for t in target.tables),
            "total_foreign_keys": sum(len(t.foreign_keys) for t in target.tables),
        },
    }


@router.post("/async/messy", response_model=JobSubmitResponse, responses=_ERR)
async def reconcile_async_messy(background_tasks: BackgroundTasks, req: MessyDemoRequest = MessyDemoRequest()):
    source, target = _messy_schemas(req)
    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.post("/stream/messy", responses=_ERR)
async def reconcile_stream_messy(req: MessyDemoRequest = MessyDemoRequest()):
    source, target = _messy_schemas(req)
    return StreamingResponse(stream_reconciliation(source, target), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/stream/files", responses=_ERR)
async def reconcile_stream_files(source_file: str, target_file: str):
    source_path = UPLOAD_DIR / source_file
    target_path = UPLOAD_DIR / target_file
    if not source_path.exists():
        api_error(404, ErrorCode.NOT_FOUND, f"Source file not found: {source_file}")
    if not target_path.exists():
        api_error(404, ErrorCode.NOT_FOUND, f"Target file not found: {target_file}")

    source_text = source_path.read_text()
    target_text = target_path.read_text()
    source = _detect_parser(source_text).parse(source_text, schema_name=_strip_ext(source_file))
    target = _detect_parser(target_text).parse(target_text, schema_name=_strip_ext(target_file))
    return StreamingResponse(stream_reconciliation(source, target), media_type="text/event-stream", headers=_SSE_HEADERS)
