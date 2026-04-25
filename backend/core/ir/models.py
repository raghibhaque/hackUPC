"""
Intermediate Representation (IR) models for SchemaSync.

Every parser normalises its input into these dataclasses.
All analysis, reconciliation, and codegen operate on this IR — never on raw SQL.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# Enums 
class ColumnType(Enum):
    """Canonical column types — parsers map vendor types onto these."""
    INTEGER = "integer"
    BIGINT = "bigint"
    SMALLINT = "smallint"
    FLOAT = "float"
    DOUBLE = "double"
    DECIMAL = "decimal"
    BOOLEAN = "boolean"
    CHAR = "char"
    VARCHAR = "varchar"
    TEXT = "text"
    BLOB = "blob"
    DATE = "date"
    TIME = "time"
    DATETIME = "datetime"
    TIMESTAMP = "timestamp"
    JSON = "json"
    UUID = "uuid"
    ENUM = "enum"
    UNKNOWN = "unknown"


class ConstraintType(Enum):
    PRIMARY_KEY = "primary_key"
    UNIQUE = "unique"
    NOT_NULL = "not_null"
    CHECK = "check"
    DEFAULT = "default"


class IndexType(Enum):
    BTREE = "btree"
    HASH = "hash"
    FULLTEXT = "fulltext"
    UNIQUE = "unique"


class RelationshipType(Enum):
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_ONE = "many_to_one"
    MANY_TO_MANY = "many_to_many"


# Core IR dataclasses 

@dataclass
class ForeignKey:
    """A foreign key reference from this column to another table.column."""
    target_table: str
    target_column: str
    on_delete: Optional[str] = None
    on_update: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "target_table": self.target_table,
            "target_column": self.target_column,
            "on_delete": self.on_delete,
            "on_update": self.on_update,
        }


@dataclass
class Column:
    """A single column in a table."""
    name: str
    raw_name: str
    col_type: ColumnType = ColumnType.UNKNOWN
    raw_type: str = ""
    nullable: bool = True
    is_primary_key: bool = False
    is_unique: bool = False
    is_auto_increment: bool = False
    default_value: Optional[str] = None
    max_length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None
    enum_values: list[str] = field(default_factory=list)
    foreign_key: Optional[ForeignKey] = None
    constraints: list[ConstraintType] = field(default_factory=list)
    comment: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "raw_name": self.raw_name,
            "col_type": self.col_type.value,
            "raw_type": self.raw_type,
            "nullable": self.nullable,
            "is_primary_key": self.is_primary_key,
            "is_unique": self.is_unique,
            "is_auto_increment": self.is_auto_increment,
            "default_value": self.default_value,
            "max_length": self.max_length,
            "precision": self.precision,
            "scale": self.scale,
            "enum_values": self.enum_values,
            "foreign_key": self.foreign_key.to_dict() if self.foreign_key else None,
            "constraints": [c.value for c in self.constraints],
            "comment": self.comment,
        }


@dataclass
class Index:
    """An index on one or more columns."""
    name: str
    columns: list[str]
    index_type: IndexType = IndexType.BTREE
    is_unique: bool = False

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "columns": self.columns,
            "index_type": self.index_type.value,
            "is_unique": self.is_unique,
        }


@dataclass
class Table:
    """A single table in a schema."""
    name: str
    raw_name: str
    columns: list[Column] = field(default_factory=list)
    indexes: list[Index] = field(default_factory=list)
    primary_key: list[str] = field(default_factory=list)
    engine: Optional[str] = None
    charset: Optional[str] = None
    comment: Optional[str] = None

    def get_column(self, name: str) -> Optional[Column]:
        for col in self.columns:
            if col.name == name:
                return col
        return None

    @property
    def foreign_keys(self) -> list[tuple[str, ForeignKey]]:
        return [
            (col.name, col.foreign_key)
            for col in self.columns
            if col.foreign_key is not None
        ]

    @property
    def column_names(self) -> list[str]:
        return [col.name for col in self.columns]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "raw_name": self.raw_name,
            "columns": [c.to_dict() for c in self.columns],
            "indexes": [i.to_dict() for i in self.indexes],
            "primary_key": self.primary_key,
            "engine": self.engine,
            "charset": self.charset,
            "comment": self.comment,
        }


@dataclass
class Schema:
    """Top-level container — the full parsed schema from one source."""
    name: str
    source_format: str = ""
    tables: list[Table] = field(default_factory=list)

    def get_table(self, name: str) -> Optional[Table]:
        for tbl in self.tables:
            if tbl.name == name:
                return tbl
        return None

    @property
    def table_names(self) -> list[str]:
        return [tbl.name for tbl in self.tables]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "source_format": self.source_format,
            "tables": [t.to_dict() for t in self.tables],
            "table_count": len(self.tables),
            "total_columns": sum(len(t.columns) for t in self.tables),
        }


# ── Reconciliation result models ────────────────────────────────────────

@dataclass
class ColumnMapping:
    source_table: str
    source_column: str
    target_table: str
    target_column: str
    source_col_type: str = ""
    target_col_type: str = ""
    structural_score: float = 0.0
    semantic_score: float = 0.0
    combined_score: float = 0.0
    match_reason: str = ""

    def to_dict(self) -> dict:
        return {
            "source_table": self.source_table,
            "source_column": self.source_column,
            "target_table": self.target_table,
            "target_column": self.target_column,
            "source_col_type": self.source_col_type,
            "target_col_type": self.target_col_type,
            "structural_score": round(self.structural_score, 4),
            "semantic_score": round(self.semantic_score, 4),
            "combined_score": round(self.combined_score, 4),
            "match_reason": self.match_reason,
        }


@dataclass
class TableMapping:
    source_table: str
    target_table: str
    structural_score: float = 0.0
    semantic_score: float = 0.0
    combined_score: float = 0.0
    column_mappings: list[ColumnMapping] = field(default_factory=list)
    unmatched_source: list[str] = field(default_factory=list)
    unmatched_target: list[str] = field(default_factory=list)
    match_reason: str = ""

    def to_dict(self) -> dict:
        return {
            "source_table": self.source_table,
            "target_table": self.target_table,
            "structural_score": round(self.structural_score, 4),
            "semantic_score": round(self.semantic_score, 4),
            "combined_score": round(self.combined_score, 4),
            "column_mappings": [cm.to_dict() for cm in self.column_mappings],
            "unmatched_source": self.unmatched_source,
            "unmatched_target": self.unmatched_target,
            "match_reason": self.match_reason,
        }


@dataclass
class Conflict:
    conflict_type: str
    source_table: str
    source_column: str
    target_table: str
    target_column: str
    source_value: str
    target_value: str
    severity: str = "warning"
    suggestion: str = ""

    def to_dict(self) -> dict:
        return {
            "conflict_type": self.conflict_type,
            "source_table": self.source_table,
            "source_column": self.source_column,
            "target_table": self.target_table,
            "target_column": self.target_column,
            "source_value": self.source_value,
            "target_value": self.target_value,
            "severity": self.severity,
            "suggestion": self.suggestion,
        }


@dataclass
class ReconciliationResult:
    source_schema: str
    target_schema: str
    table_mappings: list[TableMapping] = field(default_factory=list)
    unmatched_source_tables: list[str] = field(default_factory=list)
    unmatched_target_tables: list[str] = field(default_factory=list)
    conflicts: list[Conflict] = field(default_factory=list)
    migration_sql: Optional[str] = None

    @property
    def summary(self) -> dict:
        total_tables = len(self.table_mappings)
        total_columns = sum(len(tm.column_mappings) for tm in self.table_mappings)
        avg_confidence = (
            sum(tm.combined_score for tm in self.table_mappings) / total_tables
            if total_tables > 0 else 0.0
        )
        return {
            "tables_matched": total_tables,
            "columns_matched": total_columns,
            "unmatched_source_tables": len(self.unmatched_source_tables),
            "unmatched_target_tables": len(self.unmatched_target_tables),
            "conflicts": len(self.conflicts),
            "avg_confidence": round(avg_confidence, 4),
        }

    def to_dict(self) -> dict:
        return {
            "source_schema": self.source_schema,
            "target_schema": self.target_schema,
            "summary": self.summary,
            "table_mappings": [tm.to_dict() for tm in self.table_mappings],
            "unmatched_source_tables": self.unmatched_source_tables,
            "unmatched_target_tables": self.unmatched_target_tables,
            "conflicts": [c.to_dict() for c in self.conflicts],
            "migration_sql": self.migration_sql,
        }