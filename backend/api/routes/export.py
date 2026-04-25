"""Export route — download generated migration SQL."""

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from backend.api.errors import ErrorCode, api_error
from backend.api.models.requests import ReconcileRequest, DemoRequest
from backend.api.models.responses import ExportResponse
from backend.core.parsers.sql_ddl import SQLDDLParser
from backend.core.reconciliation.engine import ReconciliationEngine
from backend.config import DEMO_DIR

router = APIRouter(prefix="/export", tags=["export"])
parser = SQLDDLParser()
engine = ReconciliationEngine()


@router.post("/sql", response_model=ExportResponse)
async def export_migration_sql(req: ReconcileRequest):
    if not parser.can_parse(req.source_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements")
    if not parser.can_parse(req.target_sql):
        raise api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements")

    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)

    return ExportResponse(
        sql=result.migration_sql or "-- No migration generated",
        filename=f"migration_{req.source_name}_to_{req.target_name}.sql",
    )


@router.get("/demo/sql")
async def export_demo_sql():
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        raise api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name="ghost")
    target = parser.parse(wp_path.read_text(), schema_name="wordpress")
    result = engine.reconcile(source, target)

    return PlainTextResponse(
        content=result.migration_sql or "-- No migration generated",
        media_type="text/sql",
        headers={"Content-Disposition": "attachment; filename=migration_ghost_to_wordpress.sql"},
    )


@router.post("/alter", response_model=ExportResponse)
async def export_alter_migration_sql(req: ReconcileRequest):
    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)

    return ExportResponse(
        sql=result.migration_alter_sql or "-- No ALTER TABLE migration generated",
        filename=f"migration_alter_{req.source_name}_to_{req.target_name}.sql",
    )


@router.get("/demo/alter")
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


@router.post("/rollback", response_model=ExportResponse)
async def export_rollback_sql(req: ReconcileRequest):
    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema)

    return ExportResponse(
        sql=result.rollback_sql or "-- No rollback generated",
        filename=f"rollback_{req.target_name}_to_{req.source_name}.sql",
    )


@router.get("/demo/rollback")
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
