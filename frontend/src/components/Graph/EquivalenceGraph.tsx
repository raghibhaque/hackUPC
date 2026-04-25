import { useState } from 'react'
import type { ReconciliationResult } from '../../types'

type Props = {
  result: ReconciliationResult
}

export default function EquivalenceGraph({ result }: Props) {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph')

  if (result.table_mappings.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-8 text-center">
        <svg className="h-12 w-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p className="text-slate-600">No table mappings to visualize</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Equivalence Graph
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Visual representation of schema mapping relationships
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('graph')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'graph'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Flow
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Graph View */}
      {viewMode === 'graph' && (
        <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-8">
          <div className="space-y-6">
            {result.table_mappings.map((mapping, idx) => (
              <div key={idx} className="flex items-center justify-between">
                {/* Source Table */}
                <div className="flex-1">
                  <div className="rounded-lg bg-blue-50 border-2 border-blue-300 p-3">
                    <p className="font-semibold text-blue-900 text-sm">{mapping.table_a.name}</p>
                    <p className="text-xs text-blue-700 mt-1">{mapping.table_a.columns.length} columns</p>
                  </div>
                </div>

                {/* Connection Line */}
                <div className="flex-shrink-0 mx-4 flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-2">
                    <div className="h-px w-6 bg-slate-300" />
                    <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                    </svg>
                    <div className="h-px w-6 bg-slate-300" />
                  </div>
                  <div className="bg-white border-2 border-slate-300 rounded-full px-2 py-1">
                    <p className="text-xs font-bold text-slate-700">
                      {(mapping.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Target Table */}
                <div className="flex-1">
                  <div className="rounded-lg bg-green-50 border-2 border-green-300 p-3">
                    <p className="font-semibold text-green-900 text-sm">{mapping.table_b.name}</p>
                    <p className="text-xs text-green-700 mt-1">{mapping.table_b.columns.length} columns</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-12 h-6 rounded bg-blue-50 border-2 border-blue-300" />
              <span className="text-slate-700">Source Schema</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-6 rounded bg-green-50 border-2 border-green-300" />
              <span className="text-slate-700">Target Schema</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-bold">
                %
              </div>
              <span className="text-slate-700">Confidence</span>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
            <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-slate-900">
              <div>Source Table</div>
              <div>Target Table</div>
              <div>Columns Mapped</div>
              <div>Confidence</div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {result.table_mappings.map((mapping, idx) => (
              <div key={idx} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="grid grid-cols-4 gap-4 items-center text-sm">
                  <div className="font-medium text-slate-900">{mapping.table_a.name}</div>
                  <div className="font-medium text-slate-900">{mapping.table_b.name}</div>
                  <div className="text-slate-600">
                    {mapping.column_mappings.length} / {Math.max(mapping.table_a.columns.length, mapping.table_b.columns.length)}
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        mapping.confidence_label === 'HIGH'
                          ? 'bg-green-100 text-green-800'
                          : mapping.confidence_label === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {(mapping.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-600 font-medium">Total Nodes</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {result.table_mappings.length * 2}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-600 font-medium">Edges</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {result.table_mappings.length}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-600 font-medium">Avg Edge Weight</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {(
              result.table_mappings.reduce((sum, m) => sum + m.confidence, 0) /
              result.table_mappings.length *
              100
            ).toFixed(0)}
            %
          </p>
        </div>
      </div>
    </div>
  )
}
