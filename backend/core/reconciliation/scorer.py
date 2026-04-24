"""
Scorer — combines structural and semantic analysis into a single
confidence score for each candidate match.
"""

from backend.core.ir.models import Table, Column
from backend.core.analysis.structural import (
    fingerprint_table, fingerprint_column,
    structural_similarity_tables, structural_similarity_columns,
)
from backend.core.analysis.semantic import (
    semantic_similarity_tables, semantic_similarity_names,
    contextual_column_description, embedding_engine,
)


STRUCTURAL_WEIGHT = 0.35
SEMANTIC_WEIGHT = 0.65

TABLE_MATCH_THRESHOLD = 0.35
COLUMN_MATCH_THRESHOLD = 0.30


def score_table_pair(table_a: Table, table_b: Table) -> dict:
    fp_a = fingerprint_table(table_a)
    fp_b = fingerprint_table(table_b)
    structural = structural_similarity_tables(fp_a, fp_b)

    semantic = semantic_similarity_tables(table_a.name, table_b.name)

    if embedding_engine.available:
        desc_a = f"database table {' '.join(table_a.name.split('_'))} with columns {', '.join(table_a.column_names[:10])}"
        desc_b = f"database table {' '.join(table_b.name.split('_'))} with columns {', '.join(table_b.column_names[:10])}"
        embed_sim = embedding_engine.similarity(desc_a, desc_b)
        semantic = 0.6 * semantic + 0.4 * embed_sim

    combined = STRUCTURAL_WEIGHT * structural + SEMANTIC_WEIGHT * semantic

    if semantic >= 0.95:
        combined = max(combined, 0.85)

    reasons = []
    if semantic >= 0.9:
        reasons.append(f"names match: '{table_a.name}' ↔ '{table_b.name}'")
    elif semantic >= 0.6:
        reasons.append(f"names similar: '{table_a.name}' ↔ '{table_b.name}'")
    if structural >= 0.7:
        reasons.append(f"similar structure ({fp_a.column_count} vs {fp_b.column_count} cols)")
    if fp_a.has_timestamps and fp_b.has_timestamps:
        reasons.append("both have timestamps")

    return {
        "structural_score": structural,
        "semantic_score": semantic,
        "combined_score": combined,
        "match_reason": "; ".join(reasons) if reasons else "low confidence match",
    }


def score_column_pair(
    col_a: Column, col_b: Column,
    table_a_name: str = "", table_b_name: str = "",
) -> dict:
    fp_a = fingerprint_column(col_a)
    fp_b = fingerprint_column(col_b)
    structural = structural_similarity_columns(fp_a, fp_b)

    semantic = semantic_similarity_names(col_a.name, col_b.name)

    if embedding_engine.available and table_a_name and table_b_name:
        desc_a = contextual_column_description(col_a.name, table_a_name)
        desc_b = contextual_column_description(col_b.name, table_b_name)
        embed_sim = embedding_engine.similarity(desc_a, desc_b)
        semantic = 0.5 * semantic + 0.5 * embed_sim

    combined = STRUCTURAL_WEIGHT * structural + SEMANTIC_WEIGHT * semantic

    reasons = []
    if col_a.name == col_b.name:
        reasons.append(f"exact name match: '{col_a.name}'")
    elif semantic >= 0.6:
        reasons.append(f"names similar: '{col_a.name}' ↔ '{col_b.name}'")
    if col_a.col_type == col_b.col_type:
        reasons.append(f"same type: {col_a.col_type.value}")
    if col_a.is_primary_key and col_b.is_primary_key:
        reasons.append("both primary keys")
    if col_a.foreign_key and col_b.foreign_key:
        reasons.append("both foreign keys")

    return {
        "structural_score": structural,
        "semantic_score": semantic,
        "combined_score": combined,
        "match_reason": "; ".join(reasons) if reasons else "low confidence match",
    }


def build_table_score_matrix(
    source_tables: list[Table],
    target_tables: list[Table],
) -> list[list[dict]]:
    matrix = []
    for src in source_tables:
        row = []
        for tgt in target_tables:
            row.append(score_table_pair(src, tgt))
        matrix.append(row)
    return matrix


def build_column_score_matrix(
    source_cols: list[Column],
    target_cols: list[Column],
    source_table_name: str = "",
    target_table_name: str = "",
) -> list[list[dict]]:
    matrix = []
    for src in source_cols:
        row = []
        for tgt in target_cols:
            row.append(score_column_pair(src, tgt, source_table_name, target_table_name))
        matrix.append(row)
    return matrix