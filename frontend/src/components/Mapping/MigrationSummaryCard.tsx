import { AlertCircle, CheckCircle2, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReconciliationResult } from '../../types'
import { estimateMigrationComplexity } from '../../lib/migrationUtils'

interface Props {
  result: ReconciliationResult
}

export default function MigrationSummaryCard({ result }: Props) {
  const complexity = estimateMigrationComplexity(result)

  const riskyConversions = result.table_mappings?.reduce((count, tm) => {
    return count + (tm.column_mappings?.filter(cm => {
      const src = cm.col_a.data_type?.base_type || 'TEXT'
      const tgt = cm.col_b.data_type?.base_type || 'TEXT'
      return src !== tgt
    }).length || 0)
  }, 0) || 0

  const unmatchedColumns = result.table_mappings?.reduce((count, tm) => {
    return count + ((tm.unmatched_columns_a?.length || 0) + (tm.unmatched_columns_b?.length || 0))
  }, 0) || 0

  const getComplexityColor = (label: string) => {
    switch (label) {
      case 'simple':
        return 'from-emerald-500/20 to-emerald-500/10 border-emerald-500/30'
      case 'moderate':
        return 'from-amber-500/20 to-amber-500/10 border-amber-500/30'
      case 'complex':
        return 'from-rose-500/20 to-rose-500/10 border-rose-500/30'
      default:
        return 'from-white/[0.08] to-white/[0.04] border-white/[0.1]'
    }
  }

  const getComplexityIcon = (label: string) => {
    switch (label) {
      case 'simple':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
      case 'moderate':
        return <AlertCircle className="h-5 w-5 text-amber-400" />
      case 'complex':
        return <Zap className="h-5 w-5 text-rose-400" />
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border bg-gradient-to-r p-6 ${getComplexityColor(complexity.label)}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {getComplexityIcon(complexity.label)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Migration Complexity: {complexity.label}
            </h3>
            <span className="text-xs px-2 py-1 rounded bg-white/[0.1] text-white/70">
              {complexity.score} points
            </span>
          </div>

          {complexity.reasons.length > 0 && (
            <ul className="space-y-1 mb-4">
              {complexity.reasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-white/60 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-white/40 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 rounded bg-white/[0.05] border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-1">Tables to Migrate</p>
              <p className="text-lg font-semibold text-white">{result.summary.tables_matched}</p>
            </div>

            <div className="p-2 rounded bg-white/[0.05] border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-1">Type Conversions</p>
              <p className="text-lg font-semibold text-white">{riskyConversions}</p>
            </div>

            <div className="p-2 rounded bg-white/[0.05] border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-1">Unmatched Columns</p>
              <p className="text-lg font-semibold text-white">{unmatchedColumns}</p>
            </div>
          </div>

          {result.summary.total_conflicts > 0 && (
            <div className="mt-4 p-3 rounded bg-rose-500/10 border border-rose-500/30">
              <p className="text-xs text-rose-200">
                <span className="font-medium">Warning:</span> {result.summary.total_conflicts} conflict
                {result.summary.total_conflicts !== 1 ? 's' : ''} found that may require manual review
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
