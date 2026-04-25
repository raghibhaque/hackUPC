"""
Structural Analysis — generates fingerprints for tables and columns
based on their structural properties (types, constraints, relationships).
"""

from dataclasses import dataclass, field
from backend.core.ir.models import Schema, Table, Column, ColumnType


@dataclass
class ColumnFingerprint:
    name: str
    col_type: ColumnType
    nullable: bool
    is_primary_key: bool
    is_unique: bool
    is_auto_increment: bool
    is_foreign_key: bool
    has_default: bool
    max_length: int | None

    def to_vector(self) -> list[float]:
        type_index = list(ColumnType).index(self.col_type) / len(ColumnType)
        return [
            type_index,
            float(self.nullable),
            float(self.is_primary_key),
            float(self.is_unique),
            float(self.is_auto_increment),
            float(self.is_foreign_key),
            float(self.has_default),
            min((self.max_length or 0) / 1000.0, 1.0),
        ]


@dataclass
class TableFingerprint:
    name: str
    column_count: int
    pk_column_count: int
    fk_count: int
    unique_count: int
    nullable_count: int
    index_count: int
    has_timestamps: bool
    has_soft_delete: bool
    type_distribution: dict[str, int] = field(default_factory=dict)
    column_fingerprints: list[ColumnFingerprint] = field(default_factory=list)

    def to_vector(self) -> list[float]:
        total = max(self.column_count, 1)
        return [
            min(self.column_count / 50.0, 1.0),
            self.pk_column_count / total,
            self.fk_count / total,
            self.unique_count / total,
            self.nullable_count / total,
            min(self.index_count / 20.0, 1.0),
            float(self.has_timestamps),
            float(self.has_soft_delete),
        ]


def fingerprint_column(col: Column) -> ColumnFingerprint:
    return ColumnFingerprint(
        name=col.name,
        col_type=col.col_type,
        nullable=col.nullable,
        is_primary_key=col.is_primary_key,
        is_unique=col.is_unique,
        is_auto_increment=col.is_auto_increment,
        is_foreign_key=col.foreign_key is not None,
        has_default=col.default_value is not None,
        max_length=col.max_length,
    )


def fingerprint_table(table: Table) -> TableFingerprint:
    col_fps = [fingerprint_column(c) for c in table.columns]

    type_dist: dict[str, int] = {}
    for c in table.columns:
        key = c.col_type.value
        type_dist[key] = type_dist.get(key, 0) + 1

    timestamp_names = {"created_at", "updated_at", "created_on", "updated_on",
                       "createdat", "updatedat", "date_created", "date_modified",
                       "creation_date", "modification_date", "created", "updated",
                       "date_added", "last_modified"}
    col_names = {c.name for c in table.columns}
    has_timestamps = bool(col_names & timestamp_names)

    soft_delete_names = {"deleted_at", "deleted_on", "deletedat", "is_deleted",
                         "soft_deleted", "removed_at"}
    has_soft_delete = bool(col_names & soft_delete_names)

    return TableFingerprint(
        name=table.name,
        column_count=len(table.columns),
        pk_column_count=sum(1 for c in table.columns if c.is_primary_key),
        fk_count=sum(1 for c in table.columns if c.foreign_key is not None),
        unique_count=sum(1 for c in table.columns if c.is_unique),
        nullable_count=sum(1 for c in table.columns if c.nullable),
        index_count=len(table.indexes),
        has_timestamps=has_timestamps,
        has_soft_delete=has_soft_delete,
        type_distribution=type_dist,
        column_fingerprints=col_fps,
    )


def structural_similarity_columns(a: ColumnFingerprint, b: ColumnFingerprint) -> float:
    score = 0.0
    weights_total = 0.0

    w = 3.0
    weights_total += w
    if a.col_type == b.col_type:
        score += w
    elif _types_compatible(a.col_type, b.col_type):
        score += w * 0.6

    w = 1.0
    weights_total += w
    if a.nullable == b.nullable:
        score += w

    w = 2.0
    weights_total += w
    if a.is_primary_key == b.is_primary_key:
        score += w

    w = 1.0
    weights_total += w
    if a.is_unique == b.is_unique:
        score += w

    w = 1.5
    weights_total += w
    if a.is_auto_increment == b.is_auto_increment:
        score += w

    w = 1.5
    weights_total += w
    if a.is_foreign_key == b.is_foreign_key:
        score += w

    if a.max_length is not None and b.max_length is not None:
        w = 0.5
        weights_total += w
        ratio = min(a.max_length, b.max_length) / max(a.max_length, b.max_length, 1)
        score += w * ratio

    return score / weights_total if weights_total > 0 else 0.0


def structural_similarity_tables(a: TableFingerprint, b: TableFingerprint) -> float:
    va = a.to_vector()
    vb = b.to_vector()

    weights = [2.0, 1.0, 1.5, 1.0, 0.5, 0.5, 1.5, 1.0]
    dot = sum(x * y * w for x, y, w in zip(va, vb, weights))
    mag_a = sum((x * w) ** 2 for x, w in zip(va, weights)) ** 0.5
    mag_b = sum((y * w) ** 2 for y, w in zip(vb, weights)) ** 0.5

    if mag_a == 0 or mag_b == 0:
        return 0.0

    cosine = dot / (mag_a * mag_b)

    count_ratio = min(a.column_count, b.column_count) / max(a.column_count, b.column_count, 1)

    all_types = set(a.type_distribution) | set(b.type_distribution)
    if all_types:
        overlap = sum(
            min(a.type_distribution.get(t, 0), b.type_distribution.get(t, 0))
            for t in all_types
        )
        total = sum(
            max(a.type_distribution.get(t, 0), b.type_distribution.get(t, 0))
            for t in all_types
        )
        type_sim = overlap / total if total > 0 else 0.0
    else:
        type_sim = 0.0

    return 0.5 * cosine + 0.3 * count_ratio + 0.2 * type_sim


_COMPATIBLE_TYPES = [
    {ColumnType.INTEGER, ColumnType.BIGINT, ColumnType.SMALLINT},
    {ColumnType.FLOAT, ColumnType.DOUBLE, ColumnType.DECIMAL},
    {ColumnType.VARCHAR, ColumnType.TEXT, ColumnType.CHAR},
    {ColumnType.DATETIME, ColumnType.TIMESTAMP},
    {ColumnType.DATE, ColumnType.DATETIME, ColumnType.TIMESTAMP},
    {ColumnType.BOOLEAN, ColumnType.SMALLINT},
]


def _types_compatible(a: ColumnType, b: ColumnType) -> bool:
    for group in _COMPATIBLE_TYPES:
        if a in group and b in group:
            return True
    return False