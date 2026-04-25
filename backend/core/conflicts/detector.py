"""
Conflict Detector — identifies incompatibilities between matched fields.

Severity levels:
  error   — data loss or referential-integrity breakage guaranteed without manual fix
  warning — likely problem that needs review; migration may fail or corrupt data
  info    — cosmetic difference; safe to migrate as-is but worth noting
"""

from backend.core.ir.models import (
    Schema, ReconciliationResult, Conflict, ColumnType,
)

# Types that belong to the same broad family — mismatches within a family are "info".
_FAMILY: list[frozenset[ColumnType]] = [
    frozenset({ColumnType.INTEGER, ColumnType.BIGINT, ColumnType.SMALLINT}),
    frozenset({ColumnType.FLOAT, ColumnType.DOUBLE, ColumnType.DECIMAL}),
    frozenset({ColumnType.VARCHAR, ColumnType.TEXT, ColumnType.CHAR}),
    frozenset({ColumnType.DATETIME, ColumnType.TIMESTAMP}),
    frozenset({ColumnType.DATE, ColumnType.DATETIME, ColumnType.TIMESTAMP}),
    frozenset({ColumnType.BOOLEAN, ColumnType.SMALLINT, ColumnType.INTEGER}),
    frozenset({ColumnType.TEXT, ColumnType.BLOB, ColumnType.JSON}),
]

# Types that are entirely incompatible — crossing these families is always an "error".
_NUMERIC  = frozenset({ColumnType.INTEGER, ColumnType.BIGINT, ColumnType.SMALLINT,
                        ColumnType.FLOAT, ColumnType.DOUBLE, ColumnType.DECIMAL})
_STRING   = frozenset({ColumnType.VARCHAR, ColumnType.TEXT, ColumnType.CHAR,
                        ColumnType.BLOB, ColumnType.JSON, ColumnType.UUID})
_TEMPORAL = frozenset({ColumnType.DATE, ColumnType.DATETIME, ColumnType.TIMESTAMP, ColumnType.TIME})
_BOOL     = frozenset({ColumnType.BOOLEAN})
_CROSS_FAMILY_ERRORS: list[tuple[frozenset, frozenset]] = [
    (_TEMPORAL, _STRING),   # datetime ↔ varchar — needs explicit format conversion
    (_TEMPORAL, _BOOL),     # datetime ↔ boolean — nonsensical
    (_BOOL, _STRING),       # boolean ↔ text — lossy without known true/false encoding
]


def detect_conflicts(
    result: ReconciliationResult,
    source: Schema,
    target: Schema,
) -> list[Conflict]:
    conflicts: list[Conflict] = []

    for tm in result.table_mappings:
        src_table = source.get_table(tm.source_table)
        tgt_table = target.get_table(tm.target_table)
        if not src_table or not tgt_table:
            continue

        for cm in tm.column_mappings:
            src_col = src_table.get_column(cm.source_column)
            tgt_col = tgt_table.get_column(cm.target_column)
            if not src_col or not tgt_col:
                continue

            # ── Type mismatch ────────────────────────────────────────────────
            if src_col.col_type != tgt_col.col_type:
                severity = _type_mismatch_severity(src_col.col_type, tgt_col.col_type)
                conflicts.append(Conflict(
                    conflict_type="type_mismatch",
                    source_table=tm.source_table, source_column=cm.source_column,
                    target_table=tm.target_table, target_column=cm.target_column,
                    source_value=src_col.raw_type,
                    target_value=tgt_col.raw_type,
                    severity=severity,
                    suggestion=_type_suggestion(src_col.col_type, tgt_col.col_type),
                ))

            # ── Primary-key type mismatch (error — FK chains would break) ───
            if src_col.is_primary_key and tgt_col.is_primary_key:
                if src_col.col_type != tgt_col.col_type:
                    conflicts.append(Conflict(
                        conflict_type="pk_type_mismatch",
                        source_table=tm.source_table, source_column=cm.source_column,
                        target_table=tm.target_table, target_column=cm.target_column,
                        source_value=src_col.raw_type,
                        target_value=tgt_col.raw_type,
                        severity="error",
                        suggestion="Primary key type mismatch will break all foreign key references — migrate to a consistent PK type first",
                    ))

            # ── Nullability mismatch ────────────────────────────────────────
            if src_col.nullable != tgt_col.nullable:
                # NULL → NOT NULL without a default is an error (INSERT will fail)
                if src_col.nullable and not tgt_col.nullable and tgt_col.default_value is None:
                    sev = "error"
                    hint = "Adding NOT NULL without a DEFAULT will fail for any existing NULL rows — provide a DEFAULT or backfill first"
                else:
                    sev = "warning"
                    hint = "NOT NULL → NULL is safe; NULL → NOT NULL requires a DEFAULT or backfill"
                conflicts.append(Conflict(
                    conflict_type="nullable_mismatch",
                    source_table=tm.source_table, source_column=cm.source_column,
                    target_table=tm.target_table, target_column=cm.target_column,
                    source_value=f"nullable={src_col.nullable}",
                    target_value=f"nullable={tgt_col.nullable}",
                    severity=sev,
                    suggestion=hint,
                ))

            # ── Default value mismatch ──────────────────────────────────────
            if src_col.default_value != tgt_col.default_value and (src_col.default_value or tgt_col.default_value):
                conflicts.append(Conflict(
                    conflict_type="default_mismatch",
                    source_table=tm.source_table, source_column=cm.source_column,
                    target_table=tm.target_table, target_column=cm.target_column,
                    source_value=src_col.default_value or "NULL",
                    target_value=tgt_col.default_value or "NULL",
                    severity="info",
                    suggestion="Default values differ — standardise before migrating to avoid surprising row values",
                ))

            # ── Length mismatch ─────────────────────────────────────────────
            if src_col.max_length is not None and tgt_col.max_length is not None and src_col.max_length != tgt_col.max_length:
                # Source longer than target → truncation risk → error
                sev = "error" if src_col.max_length > tgt_col.max_length else "info"
                hint = (
                    f"Source length {src_col.max_length} exceeds target {tgt_col.max_length} — data will be truncated"
                    if sev == "error"
                    else f"Use the larger length: {max(src_col.max_length, tgt_col.max_length)}"
                )
                conflicts.append(Conflict(
                    conflict_type="length_mismatch",
                    source_table=tm.source_table, source_column=cm.source_column,
                    target_table=tm.target_table, target_column=cm.target_column,
                    source_value=f"length={src_col.max_length}",
                    target_value=f"length={tgt_col.max_length}",
                    severity=sev,
                    suggestion=hint,
                ))

            # ── Enum mismatch ───────────────────────────────────────────────
            if src_col.enum_values and tgt_col.enum_values:
                src_set, tgt_set = set(src_col.enum_values), set(tgt_col.enum_values)
                if src_set != tgt_set:
                    only_src = sorted(src_set - tgt_set)
                    conflicts.append(Conflict(
                        conflict_type="enum_mismatch",
                        source_table=tm.source_table, source_column=cm.source_column,
                        target_table=tm.target_table, target_column=cm.target_column,
                        source_value=str(sorted(src_col.enum_values)),
                        target_value=str(sorted(tgt_col.enum_values)),
                        severity="error" if only_src else "warning",
                        suggestion=f"Source-only values {only_src} will be rejected by the target ENUM constraint" if only_src else "Target has extra enum values — verify application code handles them",
                    ))

            # ── FK target mismatch (error — referential integrity) ──────────
            if src_col.foreign_key and tgt_col.foreign_key:
                src_fk, tgt_fk = src_col.foreign_key, tgt_col.foreign_key
                if src_fk.target_table != tgt_fk.target_table:
                    conflicts.append(Conflict(
                        conflict_type="fk_target_mismatch",
                        source_table=tm.source_table, source_column=cm.source_column,
                        target_table=tm.target_table, target_column=cm.target_column,
                        source_value=f"{src_fk.target_table}.{src_fk.target_column}",
                        target_value=f"{tgt_fk.target_table}.{tgt_fk.target_column}",
                        severity="error",
                        suggestion="FK targets differ — migrated rows will violate referential integrity unless both tables are reconciled together",
                    ))

    return conflicts


def _type_mismatch_severity(a: ColumnType, b: ColumnType) -> str:
    # Same family → safe widening, just inform
    for family in _FAMILY:
        if a in family and b in family:
            return "info"
    # Completely incompatible families → error
    for fa, fb in _CROSS_FAMILY_ERRORS:
        if (a in fa and b in fb) or (a in fb and b in fa):
            return "error"
    # Everything else → needs review
    return "warning"


def _type_suggestion(a: ColumnType, b: ColumnType) -> str:
    for family in _FAMILY:
        if a in family and b in family:
            if ColumnType.BIGINT in {a, b}:    return "Use BIGINT (wider integer)"
            if ColumnType.DOUBLE in {a, b}:    return "Use DOUBLE (wider float)"
            if ColumnType.TEXT in {a, b}:      return "Use TEXT (no length limit)"
            if ColumnType.TIMESTAMP in {a, b}: return "Use TIMESTAMP (timezone-aware)"
            if ColumnType.JSON in {a, b}:      return "Use JSON (structured storage)"
    return f"Manual conversion required: {a.value} → {b.value}"
