"""
Reconcile route — runs the full reconciliation pipeline.
"""

from fastapi import APIRouter, HTTPException
from backend.api.models.requests import ReconcileRequest, DemoRequest
from backend.api.models.responses import ReconcileResponse
from backend.core.parsers.sql_ddl import SQLDDLParser
from backend.core.reconciliation.engine import ReconciliationEngine
from backend.config import DEMO_DIR, UPLOAD_DIR

router = APIRouter(prefix="/reconcile", tags=["reconcile"])
parser = SQLDDLParser()
engine = ReconciliationEngine()


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

        source_sql = source_path.read_text()
        target_sql = target_path.read_text()

        source_name = source_file.replace(".sql", "").replace("_schema", "")
        target_name = target_file.replace(".sql", "").replace("_schema", "")

        source_schema = parser.parse(source_sql, schema_name=source_name)
        target_schema = parser.parse(target_sql, schema_name=target_name)

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