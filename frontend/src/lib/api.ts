import axios, { AxiosInstance } from 'axios'
import type { ReconciliationResult } from '../types'

const API_BASE_URL = 'http://localhost:8000/api/v1'

// ── Backend response shapes ──────────────────────────────────────────────────

interface BackendColumnMapping {
  source_table: string
  source_column: string
  target_table: string
  target_column: string
  source_col_type: string
  target_col_type: string
  structural_score: number
  semantic_score: number
  combined_score: number
  match_reason: string
}

interface BackendTableMapping {
  source_table: string
  target_table: string
  structural_score: number
  semantic_score: number
  combined_score: number
  column_mappings: BackendColumnMapping[]
  unmatched_source: string[]
  unmatched_target: string[]
  match_reason: string
}

interface BackendConflict {
  conflict_type: string
  source_table: string
  source_column: string
  target_table: string
  target_column: string
  source_value: string
  target_value: string
  severity: string
  suggestion: string
}

interface BackendResult {
  source_schema: string
  target_schema: string
  summary: {
    tables_matched: number
    columns_matched: number
    unmatched_source_tables: number
    unmatched_target_tables: number
    conflicts: number
    avg_confidence: number
  }
  table_mappings: BackendTableMapping[]
  unmatched_source_tables: string[]
  unmatched_target_tables: string[]
  conflicts: BackendConflict[]
  migration_sql: string | null
}

interface BackendReconcileResponse {
  status: string
  result?: BackendResult
  error?: string
}

export interface FileUploadResponse {
  filename: string
  tables_found: number
  table_names: string[]
}

// ── Response transformer ─────────────────────────────────────────────────────

function getConfidenceLabel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 0.8) return 'HIGH'
  if (score >= 0.5) return 'MEDIUM'
  return 'LOW'
}

function transformResult(raw: BackendResult): ReconciliationResult {
  const conflictsByKey = new Map<string, BackendConflict[]>()
  for (const c of raw.conflicts ?? []) {
    const key = `${c.source_table}.${c.source_column}`
    const arr = conflictsByKey.get(key) ?? []
    arr.push(c)
    conflictsByKey.set(key, arr)
  }

  const criticalConflicts = (raw.conflicts ?? []).filter(c => c.severity === 'error').length
  const tablesInA = raw.table_mappings.length + (raw.unmatched_source_tables?.length ?? 0)
  const tablesInB = raw.table_mappings.length + (raw.unmatched_target_tables?.length ?? 0)

  const tableMappings = raw.table_mappings.map(tm => {
    const confidence = tm.combined_score

    const srcCols = [
      ...tm.column_mappings.map(cm => ({
        name: cm.source_column,
        data_type: { base_type: cm.source_col_type || 'unknown' },
      })),
      ...(tm.unmatched_source ?? []).map(col => ({
        name: col,
        data_type: { base_type: 'unknown' },
      })),
    ]

    const tgtCols = [
      ...tm.column_mappings.map(cm => ({
        name: cm.target_column,
        data_type: { base_type: cm.target_col_type || 'unknown' },
      })),
      ...(tm.unmatched_target ?? []).map(col => ({
        name: col,
        data_type: { base_type: 'unknown' },
      })),
    ]

    const columnMappings = tm.column_mappings.map(cm => {
      const key = `${cm.source_table}.${cm.source_column}`
      const colConflicts = (conflictsByKey.get(key) ?? []).map(c => ({
        severity: c.severity,
        description: `${c.conflict_type}: ${c.source_value} → ${c.target_value}${c.suggestion ? '. ' + c.suggestion : ''}`,
      }))
      return {
        col_a: { name: cm.source_column, data_type: { base_type: cm.source_col_type || 'unknown' } },
        col_b: { name: cm.target_column, data_type: { base_type: cm.target_col_type || 'unknown' } },
        confidence: cm.combined_score,
        mapping_type: cm.match_reason || 'matched',
        conflicts: colConflicts,
      }
    })

    return {
      table_a: { name: tm.source_table, columns: srcCols },
      table_b: { name: tm.target_table, columns: tgtCols },
      confidence,
      confidence_label: getConfidenceLabel(confidence),
      structural_score: tm.structural_score,
      semantic_score: tm.semantic_score,
      column_mappings: columnMappings,
      unmatched_columns_a: (tm.unmatched_source ?? []).map(col => ({
        name: col,
        data_type: { base_type: 'unknown' },
      })),
      unmatched_columns_b: (tm.unmatched_target ?? []).map(col => ({
        name: col,
        data_type: { base_type: 'unknown' },
      })),
    }
  })

  return {
    summary: {
      tables_matched: raw.summary.tables_matched,
      tables_in_a: tablesInA,
      tables_in_b: tablesInB,
      average_confidence: raw.summary.avg_confidence,
      total_conflicts: raw.summary.conflicts,
      critical_conflicts: criticalConflicts,
    },
    table_mappings: tableMappings,
    unmatched_tables_a: raw.unmatched_source_tables ?? [],
    unmatched_tables_b: raw.unmatched_target_tables ?? [],
    migration_scaffold: raw.migration_sql ?? '',
  }
}

// ── API Client ───────────────────────────────────────────────────────────────

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({ baseURL: API_BASE_URL })
  }

  async runDemo(): Promise<ReconciliationResult> {
    const res = await this.client.post<BackendReconcileResponse>('/reconcile/demo')
    const { status, result, error } = res.data
    if (status !== 'complete' || !result) {
      throw new Error(error ?? 'Demo reconciliation failed')
    }
    return transformResult(result)
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await this.client.post<FileUploadResponse>('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.filename
  }

  async reconcileFiles(sourceFile: string, targetFile: string): Promise<ReconciliationResult> {
    const res = await this.client.post<BackendReconcileResponse>(
      `/reconcile/files?source_file=${encodeURIComponent(sourceFile)}&target_file=${encodeURIComponent(targetFile)}`
    )
    const { status, result, error } = res.data
    if (status !== 'complete' || !result) {
      throw new Error(error ?? 'Reconciliation failed')
    }
    return transformResult(result)
  }

  async health(): Promise<{ status: string }> {
    const res = await this.client.get<{ status: string }>('/health')
    return res.data
  }
}

export const apiClient = new APIClient()
export default apiClient
