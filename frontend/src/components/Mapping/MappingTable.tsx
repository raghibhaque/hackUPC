import { useState } from 'react'
import type { ReconciliationResult } from '../../types'
import ConfidenceBadge from '../shared/ConfidenceBadge'

interface Props {
  result: ReconciliationResult
}

export default function MappingTable({ result }: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
          <p className="text-sm text-blue-600 font-medium">Tables Matched</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{result.summary.tables_matched}</p>
          <p className="text-xs text-blue-700 mt-2">of {result.summary.tables_in_a}</p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-4">
          <p className="text-sm text-green-600 font-medium">Avg Confidence</p>
          <p className="text-3xl font-bold text-green-900 mt-1">{(result.summary.average_confidence * 100).toFixed(0)}%</p>
          <p className="text-xs text-green-700 mt-2">
            {result.summary.average_confidence >= 0.8 ? 'High quality' : 'Needs review'}
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-600 font-medium">Conflicts Found</p>
          <p className="text-3xl font-bold text-yellow-900 mt-1">{result.summary.total_conflicts}</p>
          <p className="text-xs text-yellow-700 mt-2">
            {result.summary.total_conflicts === 0 ? 'All clear' : `${result.summary.critical_conflicts} critical`}
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium">Unmatched</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{result.unmatched_tables_a.length}</p>
          <p className="text-xs text-slate-700 mt-2">needs manual mapping</p>
        </div>
      </div>

      {/* Table Mappings */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Table Mappings</h3>

        {result.table_mappings.length === 0 ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-8 text-center">
            <p className="text-slate-600">No table mappings found</p>
          </div>
        ) : (
          <div className="space-y-2 border border-slate-200 rounded-lg overflow-hidden">
            {result.table_mappings.map((mapping, index) => (
              <div key={index}>
                {/* Row */}
                <button
                  onClick={() => toggleRow(index)}
                  className="w-full px-4 py-3 bg-white hover:bg-slate-50 transition-colors border-b border-slate-200 last:border-b-0 flex items-center justify-between text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* Source → Target */}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {mapping.table_a.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {mapping.table_a.columns.length} columns
                        </p>
                      </div>

                      <div className="text-slate-400 font-bold">→</div>

                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {mapping.table_b.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {mapping.table_b.columns.length} columns
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <ConfidenceBadge
                        level={mapping.confidence_label}
                        value={mapping.confidence}
                      />
                      <div className="text-xs text-slate-500 mt-2 space-y-1">
                        <p>Structural: {(mapping.structural_score * 100).toFixed(0)}%</p>
                        <p>Semantic: {(mapping.semantic_score * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <svg
                      className={`h-5 w-5 text-slate-400 transition-transform ${
                        expandedRows.has(index) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded Column Mappings */}
                {expandedRows.has(index) && (
                  <div className="bg-slate-50 border-t border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-3">
                      Column Mappings ({mapping.column_mappings.length})
                    </p>

                    {mapping.column_mappings.length === 0 ? (
                      <p className="text-sm text-slate-500">No column mappings</p>
                    ) : (
                      <div className="space-y-2">
                        {mapping.column_mappings.map((col, colIndex) => (
                          <div key={colIndex} className="bg-white rounded p-3 border border-slate-200 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-slate-900">
                                {col.col_a.name}
                                <span className="text-slate-400 mx-2">→</span>
                                {col.col_b.name}
                              </div>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {(col.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex gap-4 text-xs text-slate-600">
                              <span>{col.col_a.data_type.base_type} → {col.col_b.data_type.base_type}</span>
                              <span className="text-slate-400">•</span>
                              <span>{col.mapping_type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unmatched Tables */}
      {result.unmatched_tables_a.length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
          <p className="text-sm font-semibold text-orange-900 mb-2">
            ⚠️ Unmatched Tables ({result.unmatched_tables_a.length})
          </p>
          <p className="text-sm text-orange-800">
            These tables need manual mapping: {result.unmatched_tables_a.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
