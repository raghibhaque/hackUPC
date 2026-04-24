"""
Code Generator — produces SQL migration scaffolds from reconciliation results.
"""

from backend.core.ir.models import (
    Schema, ReconciliationResult, TableMapping, ColumnMapping, ColumnType,
)


def generate_migration_sql(
    result: ReconciliationResult,
    source: Schema,
    target: Schema,
) -> str:
    lines = []
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append(f"-- SchemaSync Migration: {source.name} → {target.name}")
    lines.append(f"-- Generated automatically — review before executing")
    lines.append(f"-- ═══════════════════════════════════════════════════════════")
    lines.append("")
    lines.append("BEGIN;")
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

        lines.extend(_generate_create_table(tgt_table, target))
        lines.append("")

        if tm.column_mappings:
            lines.extend(_generate_insert_select(tm, src_table, tgt_table))
            lines.append("")

    for tbl_name in result.unmatched_target_tables:
        tgt_table = target.get_table(tbl_name)
        if tgt_table:
            lines.append(f"-- ─── NEW TABLE: {tbl_name} (no source equivalent) ───")
            lines.append("")
            lines.extend(_generate_create_table(tgt_table, target))
            lines.append("")

    if result.unmatched_source_tables:
        lines.append("-- ─── SOURCE-ONLY TABLES (no target equivalent — review needed) ───")
        for name in result.unmatched_source_tables:
            lines.append(f"--   • {name}")
        lines.append("")

    lines.append("COMMIT;")
    lines.append("")

    return "\n".join(lines)


def _generate_create_table(table, schema: Schema) -> list[str]:
    lines = []
    lines.append(f"CREATE TABLE IF NOT EXISTS {table.name} (")

    col_defs = []
    for col in table.columns:
        parts = [f"    {col.name}"]
        parts.append(_col_type_to_sql(col))

        if col.is_primary_key and col.is_auto_increment:
            parts.append("PRIMARY KEY AUTO_INCREMENT")
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
    tm: TableMapping, src_table, tgt_table,
) -> list[str]:
    lines = []

    tgt_cols = []
    src_exprs = []

    for cm in tm.column_mappings:
        tgt_cols.append(cm.target_column)

        src_col = src_table.get_column(cm.source_column)
        tgt_col = tgt_table.get_column(cm.target_column)

        if src_col and tgt_col and src_col.col_type != tgt_col.col_type:
            src_exprs.append(
                f"CAST({cm.source_column} AS {_col_type_to_sql_bare(tgt_col)}) "
                f"/* {src_col.raw_type} → {tgt_col.raw_type} */"
            )
        else:
            src_exprs.append(cm.source_column)

    lines.append(f"INSERT INTO {tm.target_table} (")
    lines.append(f"    {', '.join(tgt_cols)}")
    lines.append(f")")
    lines.append(f"SELECT")
    for i, expr in enumerate(src_exprs):
        comma = "," if i < len(src_exprs) - 1 else ""
        lines.append(f"    {expr}{comma}")
    lines.append(f"FROM {tm.source_table};")

    return lines


def _col_type_to_sql(col) -> str:
    base = _col_type_to_sql_bare(col)
    if col.col_type == ColumnType.ENUM and col.enum_values:
        vals = ", ".join(f"'{v}'" for v in col.enum_values)
        return f"ENUM({vals})"
    return base


def _col_type_to_sql_bare(col) -> str:
    t = col.col_type
    if t == ColumnType.VARCHAR:
        length = col.max_length or 255
        return f"VARCHAR({length})"
    elif t == ColumnType.CHAR:
        length = col.max_length or 1
        return f"CHAR({length})"
    elif t == ColumnType.DECIMAL:
        p = col.precision or 10
        s = col.scale or 2
        return f"DECIMAL({p},{s})"
    type_map = {
        ColumnType.INTEGER: "INT",
        ColumnType.BIGINT: "BIGINT",
        ColumnType.SMALLINT: "SMALLINT",
        ColumnType.FLOAT: "FLOAT",
        ColumnType.DOUBLE: "DOUBLE",
        ColumnType.BOOLEAN: "BOOLEAN",
        ColumnType.TEXT: "TEXT",
        ColumnType.BLOB: "BLOB",
        ColumnType.DATE: "DATE",
        ColumnType.TIME: "TIME",
        ColumnType.DATETIME: "DATETIME",
        ColumnType.TIMESTAMP: "TIMESTAMP",
        ColumnType.JSON: "JSON",
        ColumnType.UUID: "UUID",
        ColumnType.ENUM: "VARCHAR(50)",
        ColumnType.UNKNOWN: "TEXT",
    }
    return type_map.get(t, "TEXT")