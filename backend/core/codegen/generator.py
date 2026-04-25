"""
Code Generator — produces SQL migration scaffolds from reconciliation results.
"""

from backend.core.ir.models import (
    Schema, ReconciliationResult, TableMapping, ColumnType,
)
from backend.core.codegen.dialects import (
    SQLDialect, col_type_to_sql, auto_increment_clause,
    rename_table_sql, modify_column_sql,
)


def generate_migration_sql(
    result: ReconciliationResult,
    source: Schema,
    target: Schema,
    dialect: SQLDialect = SQLDialect.MYSQL,
) -> str:
    lines = []
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append(f"-- SchemaSync Migration: {source.name} → {target.name}")
    lines.append(f"-- Dialect: {dialect.value}")
    lines.append(f"-- Generated automatically — review before executing")
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    lines.append("-- ⚠ WARNING: Auto-generated migration scaffold")
    lines.append("-- Review all mappings and type casts before executing")
    lines.append("-- Back up your data before running this script")
    lines.append("")

    for tm in result.table_mappings:
        src_table = source.get_table(tm.source_table)
        tgt_table = target.get_table(tm.target_table)
        if not src_table or not tgt_table:
            continue

        lines.append(f"-- ─── {tm.source_table} → {tm.target_table} "
                      f"(confidence: {tm.combined_score:.0%}) ───")
        lines.append("")

        for cm in tm.column_mappings:
            lines.append(f"--   {cm.source_column} → {cm.target_column} "
                          f"({cm.combined_score:.0%})")

        if tm.unmatched_source:
            lines.append(f"--   ⚠ Source-only columns: {', '.join(tm.unmatched_source)}")
        if tm.unmatched_target:
            lines.append(f"--   ⚠ Target-only columns: {', '.join(tm.unmatched_target)}")

        lines.append("")

        lines.extend(_generate_create_table(tgt_table, target, dialect))
        lines.append("")

        if tm.column_mappings:
            lines.extend(_generate_insert_select(tm, src_table, tgt_table, dialect))
            lines.append("")

    for tbl_name in result.unmatched_target_tables:
        tgt_table = target.get_table(tbl_name)
        if tgt_table:
            lines.append(f"-- ─── NEW TABLE: {tbl_name} (no source equivalent) ───")
            lines.append("")
            lines.extend(_generate_create_table(tgt_table, target, dialect))
            lines.append("")

    if result.unmatched_source_tables:
        lines.append("-- ─── SOURCE-ONLY TABLES (no target equivalent — review needed) ───")
        for name in result.unmatched_source_tables:
            lines.append(f"--   • {name}")
        lines.append("")

    lines.append("COMMIT;")
    lines.append("")

    return "\n".join(lines)


def generate_alter_table_migration(
    result: ReconciliationResult,
    source: Schema,
    target: Schema,
    dialect: SQLDialect = SQLDialect.MYSQL,
) -> str:
    """Generate ALTER TABLE migration (incremental changes instead of DROP+CREATE)."""
    lines = []
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append(f"-- SchemaSync ALTER TABLE Migration: {source.name} → {target.name}")
    lines.append(f"-- Dialect: {dialect.value}")
    lines.append(f"-- Generated automatically — incremental approach (no data loss)")
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    lines.append("-- ⚠ WARNING: Auto-generated ALTER TABLE migration")
    lines.append("-- This approach preserves existing data and avoids DROP TABLE")
    lines.append("-- Review all changes carefully before executing")
    lines.append("")

    for tm in result.table_mappings:
        src_table = source.get_table(tm.source_table)
        tgt_table = target.get_table(tm.target_table)
        if not src_table or not tgt_table:
            continue

        lines.append(f"-- ─── {tm.source_table} → {tm.target_table} "
                      f"(confidence: {tm.combined_score:.0%}) ───")
        lines.append("")

        if tm.source_table != tm.target_table:
            lines.append(rename_table_sql(tm.source_table, tm.target_table, dialect))
            lines.append("")

        for cm in tm.column_mappings:
            if cm.source_column != cm.target_column:
                lines.append(
                    f"ALTER TABLE {tm.target_table} "
                    f"RENAME COLUMN {cm.source_column} TO {cm.target_column};"
                )

        if any(cm.source_column != cm.target_column for cm in tm.column_mappings):
            lines.append("")

        for cm in tm.column_mappings:
            src_col = src_table.get_column(cm.source_column)
            tgt_col = tgt_table.get_column(cm.target_column)
            if src_col and tgt_col and src_col.col_type != tgt_col.col_type:
                col_def = col_type_to_sql(tgt_col, dialect)
                lines.append(modify_column_sql(tm.target_table, cm.target_column, col_def, dialect))

        type_changes = [
            cm for cm in tm.column_mappings
            if (src_table.get_column(cm.source_column) and tgt_table.get_column(cm.target_column)
                and src_table.get_column(cm.source_column).col_type !=
                tgt_table.get_column(cm.target_column).col_type)
        ]
        if type_changes:
            lines.append("")

        for col_name in tm.unmatched_target:
            tgt_col = tgt_table.get_column(col_name)
            if tgt_col:
                col_def = f"{tgt_col.name} {col_type_to_sql(tgt_col, dialect)}"
                if tgt_col.default_value:
                    col_def += f" DEFAULT {tgt_col.default_value}"
                if not tgt_col.nullable:
                    col_def += " NOT NULL"
                lines.append(f"ALTER TABLE {tm.target_table} ADD COLUMN {col_def};")

        if tm.unmatched_target:
            lines.append("")

        if tm.unmatched_source:
            for col_name in tm.unmatched_source:
                lines.append(
                    f"-- ALTER TABLE {tm.target_table} DROP COLUMN {col_name}; /* source-only */"
                )
            lines.append("")

    lines.append("COMMIT;")
    lines.append("")

    return "\n".join(lines)


def generate_rollback_sql(
    result: ReconciliationResult,
    source: Schema,
    target: Schema,
    dialect: SQLDialect = SQLDialect.MYSQL,
) -> str:
    """Generate ROLLBACK script that undoes the migration."""
    lines = []
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append(f"-- SchemaSync Rollback: {target.name} → {source.name}")
    lines.append(f"-- Dialect: {dialect.value}")
    lines.append(f"-- Reverts the migration generated by SchemaSync")
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    lines.append("-- ⚠ WARNING: ROLLBACK SCRIPT")
    lines.append("-- This will UNDO the migration and restore the original schema")
    lines.append("-- Only execute if something went wrong with the forward migration")
    lines.append("-- Ensure you have a backup before running this")
    lines.append("")

    for tm in result.table_mappings:
        src_table = source.get_table(tm.source_table)
        tgt_table = target.get_table(tm.target_table)
        if not src_table or not tgt_table:
            continue

        lines.append(f"-- ─── Rollback {tm.target_table} → {tm.source_table} ───")
        lines.append("")

        if tm.source_table != tm.target_table:
            lines.append(rename_table_sql(tm.target_table, tm.source_table, dialect))
            lines.append("")

        for cm in tm.column_mappings:
            if cm.source_column != cm.target_column:
                lines.append(
                    f"ALTER TABLE {tm.source_table} "
                    f"RENAME COLUMN {cm.target_column} TO {cm.source_column};"
                )

        if any(cm.source_column != cm.target_column for cm in tm.column_mappings):
            lines.append("")

        for cm in tm.column_mappings:
            src_col = src_table.get_column(cm.source_column)
            tgt_col = tgt_table.get_column(cm.target_column)
            if src_col and tgt_col and src_col.col_type != tgt_col.col_type:
                original_type = col_type_to_sql(src_col, dialect)
                lines.append(modify_column_sql(tm.source_table, cm.source_column, original_type, dialect))

        type_changes = [
            cm for cm in tm.column_mappings
            if (src_table.get_column(cm.source_column) and tgt_table.get_column(cm.target_column)
                and src_table.get_column(cm.source_column).col_type !=
                tgt_table.get_column(cm.target_column).col_type)
        ]
        if type_changes:
            lines.append("")

        for col_name in tm.unmatched_target:
            lines.append(f"ALTER TABLE {tm.source_table} DROP COLUMN {col_name};")

        if tm.unmatched_target:
            lines.append("")

    if result.unmatched_target_tables:
        lines.append("-- ─── Drop tables that were created (no source equivalent) ───")
        for tbl_name in result.unmatched_target_tables:
            if dialect == SQLDialect.MYSQL:
                lines.append(f"DROP TABLE IF EXISTS {tbl_name};")
            else:
                lines.append(f"DROP TABLE IF EXISTS {tbl_name} CASCADE;")
        lines.append("")

    if result.unmatched_source_tables:
        lines.append("-- ─── Note: Source-only tables would need manual restoration ───")
        for name in result.unmatched_source_tables:
            lines.append(f"--   • {name}")
        lines.append("")

    lines.append("ROLLBACK;")
    lines.append("-- (Change ROLLBACK to COMMIT if you want to apply the rollback)")
    lines.append("")

    return "\n".join(lines)


def _generate_create_table(table, schema: Schema, dialect: SQLDialect) -> list[str]:
    lines = []
    lines.append(f"-- Drop if recreating (remove in production)")
    if dialect == SQLDialect.MYSQL:
        lines.append(f"DROP TABLE IF EXISTS {table.name};")
    else:
        lines.append(f"DROP TABLE IF EXISTS {table.name} CASCADE;")
    lines.append(f"CREATE TABLE IF NOT EXISTS {table.name} (")

    col_defs = []
    for col in table.columns:
        parts = [f"    {col.name}"]
        parts.append(col_type_to_sql(col, dialect))

        ai = auto_increment_clause(col, dialect)
        if col.is_primary_key and ai:
            parts.append(f"PRIMARY KEY {ai}")
        elif col.is_primary_key:
            parts.append("PRIMARY KEY")

        if not col.nullable and not col.is_primary_key:
            parts.append("NOT NULL")

        if col.is_unique and not col.is_primary_key:
            parts.append("UNIQUE")

        if col.default_value is not None:
            val = col.default_value
            if col.col_type in (ColumnType.VARCHAR, ColumnType.TEXT, ColumnType.CHAR):
                parts.append(f"DEFAULT '{val}'")
            else:
                parts.append(f"DEFAULT {val}")

        col_defs.append(" ".join(parts))

    for col in table.columns:
        if col.foreign_key:
            fk = col.foreign_key
            fk_def = (
                f"    FOREIGN KEY ({col.name}) REFERENCES "
                f"{fk.target_table}({fk.target_column})"
            )
            if fk.on_delete:
                fk_def += f" ON DELETE {fk.on_delete}"
            col_defs.append(fk_def)

    lines.append(",\n".join(col_defs))
    lines.append(");")

    return lines


def _generate_insert_select(
    tm: TableMapping, src_table, tgt_table, dialect: SQLDialect,
) -> list[str]:
    lines = []

    tgt_cols = []
    src_exprs = []

    for cm in tm.column_mappings:
        tgt_cols.append(cm.target_column)

        src_col = src_table.get_column(cm.source_column)
        tgt_col = tgt_table.get_column(cm.target_column)

        if src_col and tgt_col and src_col.col_type != tgt_col.col_type:
            safe_cast = _get_safe_cast(
                src_col.col_type, tgt_col.col_type,
                cm.source_column, tgt_col, dialect,
            )
            src_exprs.append(
                f"{safe_cast} /* {src_col.raw_type} → {tgt_col.raw_type} */"
            )
        else:
            src_exprs.append(cm.source_column)

    lines.append(f"-- Migrate data: {tm.source_table} → {tm.target_table}")
    lines.append(f"-- Confidence: {tm.combined_score:.0%}")
    lines.append(f"-- ⚠ Review column mappings before running")
    lines.append(f"INSERT INTO {tm.target_table} (")
    lines.append(f"    {', '.join(tgt_cols)}")
    lines.append(f")")
    lines.append(f"SELECT")
    for i, expr in enumerate(src_exprs):
        comma = "," if i < len(src_exprs) - 1 else ""
        lines.append(f"    {expr}{comma}")
    lines.append(f"FROM {tm.source_table};")

    return lines


def _get_safe_cast(
    src_type: ColumnType,
    tgt_type: ColumnType,
    col_name: str,
    tgt_col,
    dialect: SQLDialect,
) -> str:
    """Generate a safe CAST expression that handles risky conversions."""
    tgt_sql = col_type_to_sql(tgt_col, dialect)

    if src_type in (ColumnType.VARCHAR, ColumnType.CHAR, ColumnType.TEXT):
        if tgt_type in (ColumnType.INTEGER, ColumnType.BIGINT, ColumnType.SMALLINT,
                        ColumnType.DECIMAL, ColumnType.FLOAT, ColumnType.DOUBLE):
            return f"CAST(NULLIF(TRIM({col_name}), '') AS {tgt_sql})"
        if tgt_type in (ColumnType.DATETIME, ColumnType.DATE, ColumnType.TIMESTAMP, ColumnType.TIME):
            if dialect == SQLDialect.POSTGRESQL:
                return f"NULLIF(TRIM({col_name}), '')::TIMESTAMP"
            return f"STR_TO_DATE(NULLIF(TRIM({col_name}), ''), '%Y-%m-%d')"
        if tgt_type == ColumnType.BOOLEAN:
            if dialect == SQLDialect.POSTGRESQL:
                return (
                    f"CASE WHEN LOWER(NULLIF(TRIM({col_name}), '')) "
                    f"IN ('true','yes','1','t','y') THEN TRUE ELSE FALSE END"
                )
            return (
                f"CASE WHEN LOWER(NULLIF(TRIM({col_name}), '')) "
                f"IN ('true','yes','1','t','y') THEN 1 ELSE 0 END"
            )

    elif src_type in (ColumnType.INTEGER, ColumnType.BIGINT, ColumnType.SMALLINT):
        if tgt_type in (ColumnType.VARCHAR, ColumnType.TEXT, ColumnType.CHAR,
                        ColumnType.DECIMAL, ColumnType.FLOAT, ColumnType.DOUBLE):
            return f"CAST({col_name} AS {tgt_sql})"
        if tgt_type in (ColumnType.DATETIME, ColumnType.TIMESTAMP):
            if dialect == SQLDialect.POSTGRESQL:
                return f"TO_TIMESTAMP({col_name})"
            return f"FROM_UNIXTIME({col_name})"

    elif src_type in (ColumnType.DATETIME, ColumnType.TIMESTAMP):
        if tgt_type in (ColumnType.VARCHAR, ColumnType.TEXT, ColumnType.CHAR):
            if dialect == SQLDialect.POSTGRESQL:
                return f"TO_CHAR({col_name}, 'YYYY-MM-DD HH24:MI:SS')"
            return f"DATE_FORMAT({col_name}, '%Y-%m-%d %H:%i:%s')"
        if tgt_type == ColumnType.DATE:
            return f"CAST({col_name} AS DATE)"

    return f"CAST({col_name} AS {tgt_sql})"
