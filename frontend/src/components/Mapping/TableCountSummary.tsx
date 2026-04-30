import { useMemo } from 'react'
import { CheckCircle2, AlertCircle, Eye } from 'lucide-react'
import type { ReconciliationResult, TableMapping } from '@/types'

interface TableCountSummaryProps {
  result: ReconciliationResult
}

export function TableCountSummary({ result }: TableCountSummaryProps) {
  const counts = useMemo(() => {
    const total_matched = result.summary.tables_matched
    const total_unmatched_source = result.unmatched_tables_a.length
    const total_unmatched_target = result.unmatched_tables_b.length

    const tables_with_conflicts = result.table_mappings.filter((mapping: TableMapping) =>
      mapping.column_mappings.some((col) => col.conflicts && col.conflicts.length > 0)
    ).length

    const matched_without_conflicts = total_matched - tables_with_conflicts

    return {
      total_matched,
      matched_without_conflicts,
      tables_with_conflicts,
      total_unmatched_source,
      total_unmatched_target,
    }
  }, [result])

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
        <Eye className="h-4 w-4" />
        Table Summary
      </h3>

      <div className="grid grid-cols-5 gap-3 text-center text-xs md:gap-4">
        {/* Matched - Clean */}
        <div className="rounded border border-emerald-600/30 bg-emerald-900/15 p-3">
          <div className="mb-1 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-400">Matched</span>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {counts.matched_without_conflicts}
          </div>
          <div className="mt-1 text-xs text-slate-500">clean</div>
        </div>

        {/* Matched - With Conflicts */}
        <div className="rounded border border-yellow-600/30 bg-yellow-900/15 p-3">
          <div className="mb-1 flex items-center justify-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-slate-400">Conflicts</span>
          </div>
          <div className="text-lg font-bold text-yellow-400">
            {counts.tables_with_conflicts}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            of {counts.total_matched}
          </div>
        </div>

        {/* Divider */}
        <div className="border-l border-slate-700" />

        {/* Unmatched Source */}
        <div className="rounded border border-blue-600/30 bg-blue-900/15 p-3">
          <div className="mb-1 text-slate-400">Source Only</div>
          <div className="text-lg font-bold text-blue-400">
            {counts.total_unmatched_source}
          </div>
          <div className="mt-1 text-xs text-slate-500">tables</div>
        </div>

        {/* Unmatched Target */}
        <div className="rounded border border-blue-600/30 bg-blue-900/15 p-3">
          <div className="mb-1 text-slate-400">Target Only</div>
          <div className="text-lg font-bold text-blue-400">
            {counts.total_unmatched_target}
          </div>
          <div className="mt-1 text-xs text-slate-500">tables</div>
        </div>
      </div>

      {/* Summary line */}
      <div className="mt-3 border-t border-slate-700 pt-3 text-xs text-slate-400">
        <span className="font-medium text-slate-300">{counts.total_matched}</span>
        <span> tables matched • </span>
        <span className="font-medium text-slate-300">
          {counts.total_unmatched_source + counts.total_unmatched_target}
        </span>
        <span> unmatched</span>
      </div>
    </div>
  )
}
