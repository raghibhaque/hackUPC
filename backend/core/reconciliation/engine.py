"""
Reconciliation Engine — the main pipeline orchestrator.

Takes two parsed Schemas and produces a full ReconciliationResult
with table mappings, column mappings, conflicts, and migration scaffold.
"""

from backend.core.ir.models import (
    Schema, ReconciliationResult, TableMapping, ColumnMapping,
)
from backend.core.reconciliation.scorer import (
    build_table_score_matrix, build_column_score_matrix,
    TABLE_MATCH_THRESHOLD, COLUMN_MATCH_THRESHOLD,
)
from backend.core.reconciliation.assignment import hungarian_assignment
from backend.core.conflicts.detector import detect_conflicts
from backend.core.codegen.generator import generate_migration_sql


class ReconciliationEngine:
    def __init__(
        self,
        table_threshold: float = TABLE_MATCH_THRESHOLD,
        column_threshold: float = COLUMN_MATCH_THRESHOLD,
    ):
        self.table_threshold = table_threshold
        self.column_threshold = column_threshold

    def reconcile(self, source: Schema, target: Schema) -> ReconciliationResult:
        result = ReconciliationResult(
            source_schema=source.name,
            target_schema=target.name,
        )

        table_scores = build_table_score_matrix(source.tables, target.tables)

        table_assignments = hungarian_assignment(
            table_scores, threshold=self.table_threshold
        )

        matched_source_indices = set()
        matched_target_indices = set()

        for src_idx, tgt_idx, scores in table_assignments:
            src_table = source.tables[src_idx]
            tgt_table = target.tables[tgt_idx]
            matched_source_indices.add(src_idx)
            matched_target_indices.add(tgt_idx)

            table_mapping = TableMapping(
                source_table=src_table.name,
                target_table=tgt_table.name,
                structural_score=scores["structural_score"],
                semantic_score=scores["semantic_score"],
                combined_score=scores["combined_score"],
                match_reason=scores["match_reason"],
            )

            col_scores = build_column_score_matrix(
                src_table.columns, tgt_table.columns,
                src_table.name, tgt_table.name,
            )

            col_assignments = hungarian_assignment(
                col_scores, threshold=self.column_threshold
            )

            matched_src_cols = set()
            matched_tgt_cols = set()

            for sc_idx, tc_idx, col_score in col_assignments:
                src_col = src_table.columns[sc_idx]
                tgt_col = tgt_table.columns[tc_idx]
                matched_src_cols.add(sc_idx)
                matched_tgt_cols.add(tc_idx)

                table_mapping.column_mappings.append(ColumnMapping(
                    source_table=src_table.name,
                    source_column=src_col.name,
                    target_table=tgt_table.name,
                    target_column=tgt_col.name,
                    source_col_type=src_col.col_type.value,
                    target_col_type=tgt_col.col_type.value,
                    structural_score=col_score["structural_score"],
                    semantic_score=col_score["semantic_score"],
                    combined_score=col_score["combined_score"],
                    match_reason=col_score["match_reason"],
                ))

            table_mapping.unmatched_source = [
                src_table.columns[i].name
                for i in range(len(src_table.columns))
                if i not in matched_src_cols
            ]
            table_mapping.unmatched_target = [
                tgt_table.columns[i].name
                for i in range(len(tgt_table.columns))
                if i not in matched_tgt_cols
            ]

            result.table_mappings.append(table_mapping)

        result.unmatched_source_tables = [
            source.tables[i].name
            for i in range(len(source.tables))
            if i not in matched_source_indices
        ]
        result.unmatched_target_tables = [
            target.tables[i].name
            for i in range(len(target.tables))
            if i not in matched_target_indices
        ]

        result.conflicts = detect_conflicts(result, source, target)

        result.migration_sql = generate_migration_sql(result, source, target)

        return result