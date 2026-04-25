"""
Normaliser — standardises table/column names and maps vendor SQL types
to canonical ColumnType values.

Called by every parser after initial extraction.
"""

import re
from backend.core.ir.models import ColumnType


# ── Name normalisation ───────────────────────────────────────────────────

def normalise_name(raw: str) -> str:
    name = raw.strip()
    name = re.sub(r"[`\"\[\]']", "", name)
    name = name.lower()
    name = re.sub(r"[\s\-\.]+", "_", name)
    name = re.sub(r"_+", "_", name)
    return name.strip("_")


def strip_table_prefix(column_name: str, table_name: str) -> str:
    singular = table_name.rstrip("s")
    for prefix in [table_name + "_", singular + "_"]:
        if column_name.startswith(prefix) and len(column_name) > len(prefix):
            return column_name[len(prefix):]
    return column_name


# ── Type normalisation ───────────────────────────────────────────────────
#
# ORDERING RULES:
#   1. More-specific patterns must come before less-specific ones.
#      e.g. "varchar" before "char\b"  (varchar contains the substring "char")
#           "bigint"  before "int"     (bigint contains "int")
#           "boolean" before "int"     (tinyint(1) alias)
#           "timestamp" before "time"  (timestamp contains "time")
#   2. Use word boundaries (\b) to prevent false substring matches.

_TYPE_MAP: list[tuple[re.Pattern, ColumnType]] = [
    # Exact / unambiguous types first
    (re.compile(r"uuid|uniqueidentifier", re.I), ColumnType.UUID),
    (re.compile(r"json|jsonb|hstore", re.I), ColumnType.JSON),
    (re.compile(r"bool(?:ean)?|tinyint\s*\(\s*1\s*\)|bit\s*\(\s*1\s*\)", re.I), ColumnType.BOOLEAN),

    # Integer family — longest/most-specific first
    (re.compile(r"bigint|bigserial|int8", re.I), ColumnType.BIGINT),
    (re.compile(r"smallint|smallserial|int2|tinyint|mediumint|year", re.I), ColumnType.SMALLINT),
    (re.compile(r"int(?:eger)?|int4|serial\b", re.I), ColumnType.INTEGER),

    # Float / decimal
    (re.compile(r"double\s+precision|double|float8|real", re.I), ColumnType.DOUBLE),
    (re.compile(r"float4?(?!\s*\d)", re.I), ColumnType.FLOAT),
    (re.compile(r"decimal|numeric|money", re.I), ColumnType.DECIMAL),

    # Date / time — timestamp before time, datetime before date
    (re.compile(r"timestamp(?:tz)?|datetime", re.I), ColumnType.TIMESTAMP),
    (re.compile(r"^date$", re.I), ColumnType.DATE),
    (re.compile(r"^time$|timetz|time\s+without|time\s+with", re.I), ColumnType.TIME),

    # Binary
    (re.compile(r"blob|bytea|binary|varbinary|longblob|mediumblob|tinyblob", re.I), ColumnType.BLOB),

    # String — varchar / nvarchar / character varying BEFORE bare char
    (re.compile(r"varchar|character\s+varying|nvarchar|nchar\s+varying", re.I), ColumnType.VARCHAR),
    (re.compile(r"n?char(?:acter)?\b|bpchar", re.I), ColumnType.CHAR),
    (re.compile(r"text|longtext|mediumtext|tinytext|clob|ntext|xml", re.I), ColumnType.TEXT),

    # Enum / set
    (re.compile(r"enum|set\b", re.I), ColumnType.ENUM),
]


def normalise_type(raw_type: str) -> ColumnType:
    # Strip PostgreSQL / MySQL array notation before matching
    cleaned = re.sub(r"\[\s*\]", "", raw_type).strip()
    # Strip COLLATE clause
    cleaned = re.sub(r"\s+COLLATE\s+\S+", "", cleaned, flags=re.I).strip()
    for pattern, col_type in _TYPE_MAP:
        if pattern.search(cleaned):
            return col_type
    return ColumnType.UNKNOWN


def extract_length(raw_type: str) -> int | None:
    m = re.search(r"\((\d+)\)", raw_type)
    return int(m.group(1)) if m else None


def extract_precision_scale(raw_type: str) -> tuple[int | None, int | None]:
    m = re.search(r"\((\d+)\s*,\s*(\d+)\)", raw_type)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def extract_enum_values(raw_type: str) -> list[str]:
    """Extract values from ENUM(...) or SET(...) type declarations."""
    m = re.search(r"(?:enum|set)\s*\((.+)\)", raw_type, re.I)
    if m:
        inner = m.group(1)
        return [v.strip().strip("'\"") for v in inner.split(",")]
    return []
