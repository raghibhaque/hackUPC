"""Export route — download generated migration SQL."""

import csv
import io

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse, StreamingResponse

from backend.api.errors import ErrorCode, ErrorResponse, api_error, ParseErrorDetail
from backend.api.models.requests import ReconcileRequest, DemoRequest, MessyDemoRequest
from backend.api.models.responses import ExportResponse
from backend.core.codegen.dialects import SQLDialect
from backend.core.codegen.transform import generate_sqlalchemy, generate_typescript
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


_DIALECT_Q = Query(SQLDialect.MYSQL, description="SQL dialect for generated output")


@router.post("/sql", response_model=ExportResponse, responses=_ERR)
async def export_migration_sql(req: ReconcileRequest, dialect: SQLDialect = _DIALECT_Q):
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the source schema"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements", detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement to the target schema"))

    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema, dialect=dialect)

    return ExportResponse(
        sql=result.migration_sql or "-- No migration generated",
        filename=f"migration_{req.source_name}_to_{req.target_name}.sql",
    )


@router.get("/demo/sql", responses=_ERR)
async def export_demo_sql(dialect: SQLDialect = _DIALECT_Q):
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name="ghost")
    target = parser.parse(wp_path.read_text(), schema_name="wordpress")
    result = engine.reconcile(source, target, dialect=dialect)

    return PlainTextResponse(
        content=result.migration_sql or "-- No migration generated",
        media_type="text/sql",
        headers={"Content-Disposition": "attachment; filename=migration_ghost_to_wordpress.sql"},
    )


@router.post("/alter", response_model=ExportResponse, responses=_ERR)
async def export_alter_migration_sql(req: ReconcileRequest, dialect: SQLDialect = _DIALECT_Q):
    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema, dialect=dialect)

    return ExportResponse(
        sql=result.migration_alter_sql or "-- No ALTER TABLE migration generated",
        filename=f"migration_alter_{req.source_name}_to_{req.target_name}.sql",
    )


@router.get("/demo/alter", responses=_ERR)
async def export_demo_alter_sql(dialect: SQLDialect = _DIALECT_Q):
    ghost_sql = (DEMO_DIR / "ghost_schema.sql").read_text()
    wp_sql = (DEMO_DIR / "wordpress_schema.sql").read_text()

    source = parser.parse(ghost_sql, schema_name="ghost")
    target = parser.parse(wp_sql, schema_name="wordpress")
    result = engine.reconcile(source, target, dialect=dialect)

    return PlainTextResponse(
        content=result.migration_alter_sql or "-- No ALTER TABLE migration generated",
        media_type="text/sql",
        headers={"Content-Disposition": "attachment; filename=migration_alter_ghost_to_wordpress.sql"},
    )


@router.post("/rollback", response_model=ExportResponse, responses=_ERR)
async def export_rollback_sql(req: ReconcileRequest, dialect: SQLDialect = _DIALECT_Q):
    source_schema = parser.parse(req.source_sql, schema_name=req.source_name)
    target_schema = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source_schema, target_schema, dialect=dialect)

    return ExportResponse(
        sql=result.rollback_sql or "-- No rollback generated",
        filename=f"rollback_{req.target_name}_to_{req.source_name}.sql",
    )


@router.get("/demo/rollback", responses=_ERR)
async def export_demo_rollback_sql(dialect: SQLDialect = _DIALECT_Q):
    ghost_sql = (DEMO_DIR / "ghost_schema.sql").read_text()
    wp_sql = (DEMO_DIR / "wordpress_schema.sql").read_text()

    source = parser.parse(ghost_sql, schema_name="ghost")
    target = parser.parse(wp_sql, schema_name="wordpress")
    result = engine.reconcile(source, target, dialect=dialect)

    return PlainTextResponse(
        content=result.rollback_sql or "-- No rollback generated",
        media_type="text/sql",
        headers={"Content-Disposition": "attachment; filename=rollback_wordpress_to_ghost.sql"},
    )


# ── Messy demo exports ────────────────────────────────────────────────────────

def _messy_result(req: MessyDemoRequest, dialect: SQLDialect):
    legacy_path = DEMO_DIR / "messy_legacy_schema.sql"
    modern_path = DEMO_DIR / "messy_modern_schema.sql"
    if not legacy_path.exists() or not modern_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Messy demo schema files not found")
    source = parser.parse(legacy_path.read_text(), schema_name=req.source_name)
    target = parser.parse(modern_path.read_text(), schema_name=req.target_name)
    return engine.reconcile(source, target, dialect=dialect), req


@router.get("/messy/sql", response_model=ExportResponse, responses=_ERR)
async def export_messy_sql(req: MessyDemoRequest = MessyDemoRequest(), dialect: SQLDialect = _DIALECT_Q):
    result, r = _messy_result(req, dialect)
    return ExportResponse(
        sql=result.migration_sql or "-- No migration generated",
        filename=f"migration_{r.source_name}_to_{r.target_name}.sql",
    )


@router.get("/messy/alter", response_model=ExportResponse, responses=_ERR)
async def export_messy_alter_sql(req: MessyDemoRequest = MessyDemoRequest(), dialect: SQLDialect = _DIALECT_Q):
    result, r = _messy_result(req, dialect)
    return ExportResponse(
        sql=result.migration_alter_sql or "-- No ALTER TABLE migration generated",
        filename=f"migration_alter_{r.source_name}_to_{r.target_name}.sql",
    )


@router.get("/messy/rollback", response_model=ExportResponse, responses=_ERR)
async def export_messy_rollback_sql(req: MessyDemoRequest = MessyDemoRequest(), dialect: SQLDialect = _DIALECT_Q):
    result, r = _messy_result(req, dialect)
    return ExportResponse(
        sql=result.rollback_sql or "-- No rollback generated",
        filename=f"rollback_{r.target_name}_to_{r.source_name}.sql",
    )


# ── Transform code exports (#32) ──────────────────────────────────────────────

_TRANSFORM_FORMAT_Q = Query("sqlalchemy", description="Output format: sqlalchemy | typescript")


@router.post("/transform", responses=_ERR)
async def export_transform_code(req: ReconcileRequest, format: str = _TRANSFORM_FORMAT_Q):
    """Export migration code as Python (SQLAlchemy ORM) or TypeScript interfaces + mappers."""
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements",
                  detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements",
                  detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement"))

    source = parser.parse(req.source_sql, schema_name=req.source_name)
    target = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source, target)

    if format == "typescript":
        code = generate_typescript(result, source, target)
        media_type = "text/typescript"
        filename = f"migration_{req.source_name}_to_{req.target_name}.ts"
    else:
        code = generate_sqlalchemy(result, source, target)
        media_type = "text/x-python"
        filename = f"migration_{req.source_name}_to_{req.target_name}.py"

    return PlainTextResponse(
        content=code,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/demo/transform", responses=_ERR)
async def export_demo_transform(format: str = _TRANSFORM_FORMAT_Q):
    """Transform code export for the Ghost → WordPress demo."""
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name="ghost")
    target = parser.parse(wp_path.read_text(), schema_name="wordpress")
    result = engine.reconcile(source, target)

    if format == "typescript":
        code = generate_typescript(result, source, target)
        media_type = "text/typescript"
        filename = "migration_ghost_to_wordpress.ts"
    else:
        code = generate_sqlalchemy(result, source, target)
        media_type = "text/x-python"
        filename = "migration_ghost_to_wordpress.py"

    return PlainTextResponse(
        content=code,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── CSV export of column mappings ─────────────────────────────────────────────

_CSV_COLUMNS = [
    "source_table", "source_column", "source_type",
    "target_table", "target_column", "target_type",
    "structural_score", "semantic_score", "combined_score",
    "confidence_tier", "match_reason",
]


def _mappings_to_csv(result, source_name: str, target_name: str, filename: str) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for tm in result.table_mappings:
        for cm in tm.column_mappings:
            writer.writerow({
                "source_table": cm.source_table,
                "source_column": cm.source_column,
                "source_type": cm.source_col_type,
                "target_table": cm.target_table,
                "target_column": cm.target_column,
                "target_type": cm.target_col_type,
                "structural_score": round(cm.structural_score, 4),
                "semantic_score": round(cm.semantic_score, 4),
                "combined_score": round(cm.combined_score, 4),
                "confidence_tier": cm.to_dict()["confidence_tier"],
                "match_reason": cm.match_reason,
            })
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/csv", responses=_ERR)
async def export_mappings_csv(req: ReconcileRequest):
    """Export all column mappings as a CSV file."""
    if not parser.can_parse(req.source_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Source SQL has no CREATE TABLE statements",
                  detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement"))
    if not parser.can_parse(req.target_sql):
        api_error(400, ErrorCode.PARSE_ERROR, "Target SQL has no CREATE TABLE statements",
                  detail=ParseErrorDetail(hint="Add at least one CREATE TABLE statement"))

    source = parser.parse(req.source_sql, schema_name=req.source_name)
    target = parser.parse(req.target_sql, schema_name=req.target_name)
    result = engine.reconcile(source, target)
    filename = f"mappings_{req.source_name}_to_{req.target_name}.csv"
    return _mappings_to_csv(result, req.source_name, req.target_name, filename)


@router.get("/demo/csv", responses=_ERR)
async def export_demo_mappings_csv():
    """Export Ghost → WordPress column mappings as CSV."""
    ghost_path = DEMO_DIR / "ghost_schema.sql"
    wp_path = DEMO_DIR / "wordpress_schema.sql"
    if not ghost_path.exists() or not wp_path.exists():
        api_error(500, ErrorCode.INTERNAL_ERROR, "Demo schema files not found")

    source = parser.parse(ghost_path.read_text(), schema_name="ghost")
    target = parser.parse(wp_path.read_text(), schema_name="wordpress")
    result = engine.reconcile(source, target)
    return _mappings_to_csv(result, "ghost", "wordpress", "mappings_ghost_to_wordpress.csv")
