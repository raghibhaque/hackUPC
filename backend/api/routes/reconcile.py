"""
Reconcile route — runs the full reconciliation pipeline.
"""

import re

from fastapi import APIRouter, BackgroundTasks, HTTPException
from backend.api.models.requests import ReconcileRequest, DemoRequest
from backend.api.models.responses import ReconcileResponse, JobSubmitResponse, JobStatusResponse
from backend.core.parsers.sql_ddl import SQLDDLParser
from backend.core.parsers.prisma import PrismaParser
from backend.core.parsers.json_schema import JSONSchemaParser
from backend.core.parsers.base import BaseParser
from backend.core.reconciliation.engine import ReconciliationEngine
from backend.config import DEMO_DIR, UPLOAD_DIR
from backend.services.pipeline import create_job, get_job, run_reconciliation_job

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
    raise HTTPException(400, "Could not detect schema format (supported: SQL DDL, Prisma, JSON Schema)")


@router.post("/demo", response_model=ReconcileResponse)
async def reconcile_demo(req: DemoRequest = DemoRequest()):
    try:
        ghost_path = DEMO_DIR / "ghost_schema.sql"
        wp_path = DEMO_DIR / "wordpress_schema.sql"

        if not ghost_path.exists() or not wp_path.exists():
            raise HTTPException(500, "Demo schema files not found")

        source_sql = ghost_path.read_text()
        target_sql = wp_path.read_text()

        source_schema = parser.parse(source_sql, schema_name=req.source_name)
        target_schema = parser.parse(target_sql, schema_name=req.target_name)

        result = engine.reconcile(source_schema, target_schema)

        return ReconcileResponse(
            status="complete",
            result=result.to_dict(),
        )

    except HTTPException:
        raise
    except Exception as e:
        return ReconcileResponse(
            status="error",
            error=str(e),
        )


@router.post("/", response_model=ReconcileResponse)
async def reconcile_raw(req: ReconcileRequest):
    try:
        if not parser.can_parse(req.source_sql):
            raise HTTPException(400, "Source SQL has no CREATE TABLE statements")
        if not parser.can_parse(req.target_sql):
            raise HTTPException(400, "Target SQL has no CREATE TABLE statements")

        source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
        target_schema = parser.parse(req.target_sql, schema_name=req.target_name)

        result = engine.reconcile(source_schema, target_schema)

        return ReconcileResponse(
            status="complete",
            result=result.to_dict(),
        )

    except HTTPException:
        raise
    except Exception as e:
        return ReconcileResponse(
            status="error",
            error=str(e),
        )


@router.post("/files", response_model=ReconcileResponse)
async def reconcile_files(source_file: str, target_file: str):
    try:
        source_path = UPLOAD_DIR / source_file
        target_path = UPLOAD_DIR / target_file

        if not source_path.exists():
            raise HTTPException(404, f"Source file not found: {source_file}")
        if not target_path.exists():
            raise HTTPException(404, f"Target file not found: {target_file}")

        source_text = source_path.read_text()
        target_text = target_path.read_text()

        source_name = re.sub(r"\.(sql|prisma|json)$", "", source_file).replace("_schema", "")
        target_name = re.sub(r"\.(sql|prisma|json)$", "", target_file).replace("_schema", "")

        source_schema = _detect_parser(source_text).parse(source_text, schema_name=source_name)
        target_schema = _detect_parser(target_text).parse(target_text, schema_name=target_name)

        result = engine.reconcile(source_schema, target_schema)

        return ReconcileResponse(
            status="complete",
            result=result.to_dict(),
        )

    except HTTPException:
        raise
    except Exception as e:
        return ReconcileResponse(
            status="error",
            error=str(e),
        )
@router.post("/demo/stats")
async def reconcile_demo_stats(req: DemoRequest = DemoRequest()):
    try:
        ghost_path = DEMO_DIR / "ghost_schema.sql"
        wp_path = DEMO_DIR / "wordpress_schema.sql"

        source_sql = ghost_path.read_text()
        target_sql = wp_path.read_text()

        source_schema = parser.parse(source_sql, schema_name=req.source_name)
        target_schema = parser.parse(target_sql, schema_name=req.target_name)

        result = engine.reconcile(source_schema, target_schema)

        high_confidence = [tm for tm in result.table_mappings if tm.combined_score >= 0.8]
        medium_confidence = [tm for tm in result.table_mappings if 0.5 <= tm.combined_score < 0.8]
        low_confidence = [tm for tm in result.table_mappings if tm.combined_score < 0.5]

        type_conflicts = [c for c in result.conflicts if c.conflict_type == "type_mismatch"]
        nullable_conflicts = [c for c in result.conflicts if c.conflict_type == "nullable_mismatch"]
        length_conflicts = [c for c in result.conflicts if c.conflict_type == "length_mismatch"]

        return {
            "status": "complete",
            "elapsed_seconds": result.elapsed_seconds,
            "source": source_schema.to_dict(),
            "target": target_schema.to_dict(),
            "summary": result.summary,
            "confidence_breakdown": {
                "high": len(high_confidence),
                "medium": len(medium_confidence),
                "low": len(low_confidence),
            },
            "conflict_breakdown": {
                "type_mismatch": len(type_conflicts),
                "nullable_mismatch": len(nullable_conflicts),
                "length_mismatch": len(length_conflicts),
                "other": len(result.conflicts) - len(type_conflicts) - len(nullable_conflicts) - len(length_conflicts),
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
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ---------------------------------------------------------------------------
# Async job endpoints
# ---------------------------------------------------------------------------

@router.post("/async", response_model=JobSubmitResponse)
async def reconcile_async(req: ReconcileRequest, background_tasks: BackgroundTasks):
    if not parser.can_parse(req.source_sql):
        raise HTTPException(400, "Source SQL has no CREATE TABLE statements")
    if not parser.can_parse(req.target_sql):
        raise HTTPException(400, "Target SQL has no CREATE TABLE statements")

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
        raise HTTPException(500, "Demo schema files not found")

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
        raise HTTPException(404, f"Source file not found: {source_file}")
    if not target_path.exists():
        raise HTTPException(404, f"Target file not found: {target_file}")

    source_text = source_path.read_text()
    target_text = target_path.read_text()

    source_name = re.sub(r"\.(sql|prisma|json)$", "", source_file).replace("_schema", "")
    target_name = re.sub(r"\.(sql|prisma|json)$", "", target_file).replace("_schema", "")

    source = _detect_parser(source_text).parse(source_text, schema_name=source_name)
    target = _detect_parser(target_text).parse(target_text, schema_name=target_name)

    job = create_job()
    background_tasks.add_task(run_reconciliation_job, job.id, source, target)
    return JobSubmitResponse(job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, f"Job not found: {job_id}")
    return JobStatusResponse(**job.to_dict())