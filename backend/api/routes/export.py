"""Export route — download generated migration SQL."""

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from backend.api.errors import ErrorCode, ErrorResponse, api_error, ParseErrorDetail
from backend.api.models.requests import ReconcileRequest, DemoRequest, MessyDemoRequest
from backend.api.models.responses import ExportResponse
from backend.core.parsers.sql_ddl import SQLDDLParser
from backend.core.reconciliation.engine import ReconciliationEngine
from backend.config import DEMO_DIR

router = APIRouter(prefix="/export", tags=["export"])
parser = SQLDDLParser()
engine = ReconciliationEngine()

_ERR = {
    400: {"model": ErrorResponse, "description": "Parse error or invalid input"},
    404: {"model": ErrorResponse, "description": "Resource not found"},
    422: {"model": ErrorResponse, "description": "Request validation failed"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}


@router.post("/sql", response_model=ExportResponse, responses=_ERR)
async def export_migration_sql(req: ReconcileRequest):
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the source schema"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the target schema"))

    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)

    return ExportResponse(
        sql=result.migration_sql or "-- No migration generated",
        filename=f"migration_{req.source_name}_to_{req.target_name}.sql",
    )


@router.get("/demo/sql", responses=_ERR)
async def export_demo_sql():
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name="ghost")
    target = parser.parse(wp_path.read_text(), schema_name="wordpress")
    result = engine.reconcile(source, target)

    return PlainTextResponse(
        content=result.migration_sql or "-- No migration generated",
        media_type="text/sql",
        headers={"Content-Disposition": "attachment; filename=migration_ghost_to_wordpress.sql"},
    )


@router.post("/alter", response_model=ExportResponse, responses=_ERR)
async def export_alter_migration_sql(req: ReconcileRequest):
    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)

    return ExportResponse(
        sql=result.migration_alter_sql or "-- No ALTER TABLE migration generated",
        filename=f"migration_alter_{req.source_name}_to_{req.target_name}.sql",
    )


@router.get("/demo/alter", responses=_ERR)
async def export_demo_alter_sql():
    ghost_sql = (DEMO_DIR / "ghost_schema.sql").read_text()
    wp_sql = (DEMO_DIR / "wordpress_schema.sql").read_text()

    source = parser.parse(ghost_sql, schema_name="ghost")
    target = parser.parse(wp_sql, schema_name="wordpress")
    result = engine.reconcile(source, target)

    return PlainTextResponse(
        content=result.migration_alter_sql or "-- No ALTER TABLE migration generated",
        media_type="text/sql",
        headers={"Content-Disposition": "attachment; filename=migration_alter_ghost_to_wordpress.sql"},
    )


@router.post("/rollback", response_model=ExportResponse, responses=_ERR)
async def export_rollback_sql(req: ReconcileRequest):
    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)

    return ExportResponse(
        sql=result.rollback_sql or "-- No rollback generated",
        filename=f"rollback_{req.target_name}_to_{req.source_name}.sql",
    )


@router.get("/demo/rollback", responses=_ERR)
async def export_demo_rollback_sql():
    ghost_sql = (DEMO_DIR / "ghost_schema.sql").read_text()
    wp_sql = (DEMO_DIR / "wordpress_schema.sql").read_text()

    source = parser.parse(ghost_sql, schema_name="ghost")
    target = parser.parse(wp_sql, schema_name="wordpress")
    result = engine.reconcile(source, target)

    return PlainTextResponse(
        content=result.rollback_sql or "-- No rollback generated",
        media_type="text/sql",
        headers={"Content-Disposition": "attachment; filename=rollback_wordpress_to_ghost.sql"},
    )


# ── Messy demo exports ────────────────────────────────────────────────────────

def _messy_result(req: MessyDemoRequest):
    legacy_path = DEMO_DIR / "messy_legacy_schema.sql"
    modern_path = DEMO_DIR / "messy_modern_schema.sql"
    if not legacy_path.exists() or not modern_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Messy demo schema files not found")
    source = parser.parse(legacy_path.read_text(), schema_name=req.source_name)
    target = parser.parse(modern_path.read_text(), schema_name=req.target_name)
    return engine.reconcile(source, target), req


@router.get("/messy/sql", response_model=ExportResponse, responses=_ERR)
async def export_messy_sql(req: MessyDemoRequest = MessyDemoRequest()):
    result, r = _messy_result(req)
    return ExportResponse(
        sql=result.migration_sql or "-- No migration generated",
        filename=f"migration_{r.source_name}_to_{r.target_name}.sql",
    )


@router.get("/messy/alter", response_model=ExportResponse, responses=_ERR)
async def export_messy_alter_sql(req: MessyDemoRequest = MessyDemoRequest()):
    result, r = _messy_result(req)
    return ExportResponse(
        sql=result.migration_alter_sql or "-- No ALTER TABLE migration generated",
        filename=f"migration_alter_{r.source_name}_to_{r.target_name}.sql",
    )


@router.get("/messy/rollback", response_model=ExportResponse, responses=_ERR)
async def export_messy_rollback_sql(req: MessyDemoRequest = MessyDemoRequest()):
    result, r = _messy_result(req)
    return ExportResponse(
        sql=result.rollback_sql or "-- No rollback generated",
        filename=f"rollback_{r.target_name}_to_{r.source_name}.sql",
    )
