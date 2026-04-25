export type UploadState = {
  isLoading: boolean
  error?: string
}

export type AnalysisState = {
  activeTab: 'mappings' | 'graph' | 'conflicts' | 'migration'
  isExporting: boolean
  result?: ReconciliationResult
}

export type Column = {
  name: string
  data_type?: {
    base_type: string
  }
}

export type Table = {
  name: string
  columns: Column[]
}

export type ColumnMapping = {
  col_a: Column
  col_b: Column
  confidence: number
  mapping_type?: string
  conflicts?: unknown[]
  sample_values_a?: string[]
  sample_values_b?: string[]
}

export type TableMapping = {
  table_a: Table
  table_b: Table
  confidence: number
  confidence_label?: string
  structural_score?: number
  semantic_score?: number
  column_mappings?: ColumnMapping[]
  unmatched_columns_a?: Column[]
  unmatched_columns_b?: Column[]
}

export type ReconciliationResult = {
  summary: {
    tables_matched: number
    tables_in_a: number
    tables_in_b: number
    average_confidence: number
    total_conflicts: number
    critical_conflicts: number
  }
  table_mappings: TableMapping[]
  unmatched_tables_a: Table[]
  unmatched_tables_b: Table[]
  migration_scaffold: string
}