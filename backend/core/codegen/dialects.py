"""SQL dialect adapters — translate canonical IR types to vendor-specific DDL."""

from enum import Enum
from backend.core.ir.models import ColumnType


class SQLDialect(str, Enum):
    MYSQL      = "mysql"
    POSTGRESQL = "postgresql"
    SQLITE     = "sqlite"


def col_type_to_sql(col, dialect: SQLDialect = SQLDialect.MYSQL) -> str:
    """Render a Column's type as a DDL fragment for the requested dialect."""
    t = col.col_type

    if dialect == SQLDialect.POSTGRESQL:
        return _pg_type(col, t)
    if dialect == SQLDialect.SQLITE:
        return _sqlite_type(col, t)
    return _mysql_type(col, t)


# ── MySQL ─────────────────────────────────────────────────────────────────────

def _mysql_type(col, t: ColumnType) -> str:
    if t == ColumnType.VARCHAR:
        return f"VARCHAR({col.max_length or 255})"
    if t == ColumnType.CHAR:
        return f"CHAR({col.max_length or 1})"
    if t == ColumnType.DECIMAL:
        return f"DECIMAL({col.precision or 10},{col.scale or 2})"
    if t == ColumnType.ENUM and col.enum_values:
        vals = ", ".join(f"'{v}'" for v in col.enum_values)
        return f"ENUM({vals})"
    return {
        ColumnType.INTEGER:   "INT",
        ColumnType.BIGINT:    "BIGINT",
        ColumnType.SMALLINT:  "SMALLINT",
        ColumnType.FLOAT:     "FLOAT",
        ColumnType.DOUBLE:    "DOUBLE",
        ColumnType.BOOLEAN:   "TINYINT(1)",
        ColumnType.TEXT:      "TEXT",
        ColumnType.BLOB:      "BLOB",
        ColumnType.DATE:      "DATE",
        ColumnType.TIME:      "TIME",
        ColumnType.DATETIME:  "DATETIME",
        ColumnType.TIMESTAMP: "TIMESTAMP",
        ColumnType.JSON:      "JSON",
        ColumnType.UUID:      "VARCHAR(36)",
        ColumnType.UNKNOWN:   "TEXT",
    }.get(t, "TEXT")


# ── PostgreSQL ────────────────────────────────────────────────────────────────

def _pg_type(col, t: ColumnType) -> str:
    if t == ColumnType.INTEGER and col.is_auto_increment:
        return "SERIAL"
    if t == ColumnType.BIGINT and col.is_auto_increment:
        return "BIGSERIAL"
    if t == ColumnType.SMALLINT and col.is_auto_increment:
        return "SMALLSERIAL"
    if t == ColumnType.VARCHAR:
        return f"VARCHAR({col.max_length or 255})"
    if t == ColumnType.CHAR:
        return f"CHAR({col.max_length or 1})"
    if t == ColumnType.DECIMAL:
        return f"NUMERIC({col.precision or 10},{col.scale or 2})"
    if t == ColumnType.ENUM and col.enum_values:
        # PostgreSQL enums are created as types; emit a VARCHAR with a CHECK
        vals = ", ".join(f"'{v}'" for v in col.enum_values)
        return f"VARCHAR(50) CHECK ({col.name} IN ({vals}))"
    return {
        ColumnType.INTEGER:   "INTEGER",
        ColumnType.BIGINT:    "BIGINT",
        ColumnType.SMALLINT:  "SMALLINT",
        ColumnType.FLOAT:     "REAL",
        ColumnType.DOUBLE:    "DOUBLE PRECISION",
        ColumnType.BOOLEAN:   "BOOLEAN",
        ColumnType.TEXT:      "TEXT",
        ColumnType.BLOB:      "BYTEA",
        ColumnType.DATE:      "DATE",
        ColumnType.TIME:      "TIME",
        ColumnType.DATETIME:  "TIMESTAMP",
        ColumnType.TIMESTAMP: "TIMESTAMPTZ",
        ColumnType.JSON:      "JSONB",
        ColumnType.UUID:      "UUID",
        ColumnType.UNKNOWN:   "TEXT",
    }.get(t, "TEXT")


# ── SQLite ────────────────────────────────────────────────────────────────────

def _sqlite_type(col, t: ColumnType) -> str:
    # SQLite uses type affinity — map to the four storage classes
    if t in (ColumnType.INTEGER, ColumnType.BIGINT, ColumnType.SMALLINT,
             ColumnType.BOOLEAN):
        return "INTEGER"
    if t in (ColumnType.FLOAT, ColumnType.DOUBLE, ColumnType.DECIMAL):
        return "REAL"
    if t in (ColumnType.BLOB,):
        return "BLOB"
    if t == ColumnType.ENUM and col.enum_values:
        vals = ", ".join(f"'{v}'" for v in col.enum_values)
        return f"TEXT CHECK ({col.name} IN ({vals}))"
    # Everything else falls to TEXT (SQLite's most flexible affinity)
    return "TEXT"


def auto_increment_clause(col, dialect: SQLDialect) -> str:
    """Return the dialect-specific auto-increment DDL fragment (or empty string)."""
    if not col.is_auto_increment:
        return ""
    if dialect == SQLDialect.MYSQL:
        return "AUTO_INCREMENT"
    if dialect == SQLDialect.POSTGRESQL:
        return ""  # handled by SERIAL type
    if dialect == SQLDialect.SQLITE:
        return "AUTOINCREMENT"
    return ""


def begin_transaction(dialect: SQLDialect) -> str:
    return "BEGIN;" if dialect != SQLDialect.POSTGRESQL else "BEGIN;"


def rename_table_sql(old: str, new: str, dialect: SQLDialect) -> str:
    if dialect == SQLDialect.MYSQL:
        return f"RENAME TABLE {old} TO {new};"
    return f"ALTER TABLE {old} RENAME TO {new};"


def modify_column_sql(table: str, col_name: str, col_def: str, dialect: SQLDialect) -> str:
    if dialect == SQLDialect.POSTGRESQL:
        return f"ALTER TABLE {table} ALTER COLUMN {col_name} TYPE {col_def};"
    if dialect == SQLDialect.SQLITE:
        return f"-- SQLite does not support ALTER COLUMN — recreate table to change {table}.{col_name}"
    return f"ALTER TABLE {table} MODIFY COLUMN {col_name} {col_def};"
