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
    tokenise, canonicalise_tokens,
)


STRUCTURAL_WEIGHT = 0.35
SEMANTIC_WEIGHT = 0.65

TABLE_MATCH_THRESHOLD = 0.35
COLUMN_MATCH_THRESHOLD = 0.30


def confidence_tier(score: float) -> str:
    """Map a 0–1 combined score to a human-readable confidence tier."""
    if score >= 0.95:
        return "exact"
    if score >= 0.80:
        return "high"
    if score >= 0.60:
        return "medium"
    if score >= 0.40:
        return "low"
    return "uncertain"


def _column_name_overlap(table_a: Table, table_b: Table) -> float:
    """Fraction of canonical column name tokens shared between two tables."""
    def _canon_set(table: Table) -> set[str]:
        result: set[str] = set()
        for name in table.column_names:
            result.update(canonicalise_tokens(tokenise(name)))
        return result

    canon_a = _canon_set(table_a)
    canon_b = _canon_set(table_b)
    union = canon_a | canon_b
    if not union:
        return 0.0
    return len(canon_a & canon_b) / len(union)


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

    # Boost: strong name match should floor at 0.85
    if semantic >= 0.95:
        combined = max(combined, 0.85)

    # Column-name overlap: blend in a 10% bonus on top when meaningful
    col_overlap = _column_name_overlap(table_a, table_b)
    if col_overlap >= 0.3:
        combined = min(1.0, combined + col_overlap * 0.08)

    # Structural veto: very different structure despite name match → cap at medium
    if structural < 0.15 and semantic >= 0.80:
        combined = min(combined, 0.65)

    # Size penalty: drastically different column counts reduce confidence
    count_ratio = min(fp_a.column_count, fp_b.column_count) / max(fp_a.column_count, fp_b.column_count, 1)
    if count_ratio < 0.25:
        combined *= 0.85

    reasons = []
    if semantic >= 0.9:
        reasons.append(f"Strong name match: '{table_a.name}' ↔ '{table_b.name}' ({semantic:.0%})")
    elif semantic >= 0.6:
        reasons.append(f"Partial name match: '{table_a.name}' ↔ '{table_b.name}' ({semantic:.0%})")
    if structural >= 0.7:
        reasons.append(f"Similar structure: {fp_a.column_count} vs {fp_b.column_count} cols, high type overlap")
    elif structural >= 0.4:
        reasons.append(f"Moderate structure: {fp_a.column_count} vs {fp_b.column_count} cols")
    if col_overlap >= 0.5:
        reasons.append(f"High column-name overlap ({col_overlap:.0%} shared canonical tokens)")
    elif col_overlap >= 0.3:
        reasons.append(f"Moderate column-name overlap ({col_overlap:.0%})")
    if fp_a.has_timestamps and fp_b.has_timestamps:
        reasons.append("Both use audit timestamps")
    if fp_a.fk_count > 0 and fp_b.fk_count > 0:
        reasons.append(f"Both have foreign keys ({fp_a.fk_count} vs {fp_b.fk_count})")
    if fp_a.pk_column_count == fp_b.pk_column_count:
        reasons.append(f"Same PK structure ({fp_a.pk_column_count} PK cols)")

    return {
        "structural_score": structural,
        "semantic_score": semantic,
        "combined_score": combined,
        "confidence_tier": confidence_tier(combined),
        "column_name_overlap": round(col_overlap, 4),
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

    # Primary-key mismatch is a strong negative signal — cap at "low"
    if col_a.is_primary_key != col_b.is_primary_key:
        combined = min(combined, 0.55)

    reasons = []
    if col_a.name == col_b.name:
        reasons.append(f"Exact name match: '{col_a.name}'")
    elif semantic >= 0.9:
        reasons.append(f"Strong name match: '{col_a.name}' ↔ '{col_b.name}' ({semantic:.0%})")
    elif semantic >= 0.6:
        reasons.append(f"Synonym match: '{col_a.name}' ↔ '{col_b.name}' ({semantic:.0%})")
    if col_a.col_type == col_b.col_type:
        reasons.append(f"Same type: {col_a.col_type.value}")
    elif structural >= 0.6:
        reasons.append(f"Compatible types: {col_a.col_type.value} ↔ {col_b.col_type.value}")
    else:
        reasons.append(f"Type divergence: {col_a.col_type.value} ↔ {col_b.col_type.value}")
    if col_a.is_primary_key and col_b.is_primary_key:
        reasons.append("Both primary keys")
    if col_a.foreign_key and col_b.foreign_key:
        reasons.append("Both foreign keys")
    if col_a.nullable == col_b.nullable:
        reasons.append(f"Same nullability ({'nullable' if col_a.nullable else 'NOT NULL'})")
    if col_a.is_auto_increment and col_b.is_auto_increment:
        reasons.append("Both auto-increment")

    return {
        "structural_score": structural,
        "semantic_score": semantic,
        "combined_score": combined,
        "confidence_tier": confidence_tier(combined),
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
