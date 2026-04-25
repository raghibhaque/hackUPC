import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReconciliationResult } from '../../types'

interface Risk {
  level: 'error' | 'warning' | 'info'
  message: string
  details: string
}

interface Props {
  result: ReconciliationResult
}

export default function DataLossRiskIndicator({ result }: Props) {
  const risks: Risk[] = []

  // Check for risky type conversions
  const riskyConversions = result.table_mappings?.reduce((acc, tm) => {
    const risky = tm.column_mappings?.filter(cm => {
      const src = cm.col_a.data_type?.base_type || ''
      const tgt = cm.col_b.data_type?.base_type || ''
      const srcLower = src.toLowerCase()
      const tgtLower = tgt.toLowerCase()

      // High-risk conversions
      return (
        (srcLower.includes('varchar') || srcLower.includes('text')) &&
        (tgtLower.includes('int') || tgtLower.includes('decimal') || tgtLower.includes('date'))
      ) ||
      (srcLower.includes('datetime') && tgtLower.includes('int'))
    }) || []
    return acc + risky.length
  }, 0) || 0

  if (riskyConversions > 0) {
    risks.push({
      level: 'error',
      message: `${riskyConversions} high-risk type conversion${riskyConversions !== 1 ? 's' : ''}`,
      details: 'Converting between string and numeric/date types may cause data loss. Review and test thoroughly.',
    })
  }

  // Check for column drops
  const columnDrops = result.table_mappings?.reduce((count, tm) => {
    return count + (tm.unmatched_columns_a?.length || 0)
  }, 0) || 0

  if (columnDrops > 0) {
    risks.push({
      level: 'warning',
      message: `${columnDrops} source column${columnDrops !== 1 ? 's' : ''} will be dropped`,
      details: 'Columns in the source that have no target mapping will not be migrated. Verify this is intentional.',
    })
  }

  // Check for new tables/columns in target
  const newColumns = result.table_mappings?.reduce((count, tm) => {
    return count + (tm.unmatched_columns_b?.length || 0)
  }, 0) || 0

  if (newColumns > 0) {
    risks.push({
      level: 'info',
      message: `${newColumns} new column${newColumns !== 1 ? 's' : ''} in target schema`,
      details: 'These columns exist in the target but not in the source. They will need default values or special handling.',
    })
  }

  // Check for low confidence mappings
  const lowConfidence = result.table_mappings?.filter(tm => tm.confidence < 0.7).length || 0

  if (lowConfidence > 0) {
    risks.push({
      level: 'warning',
      message: `${lowConfidence} low-confidence mapping${lowConfidence !== 1 ? 's' : ''}`,
      details: 'Some table mappings have low confidence scores. Manual review recommended.',
    })
  }

  // Check for conflicts
  if (result.summary.total_conflicts > 0) {
    risks.push({
      level: result.summary.critical_conflicts > 0 ? 'error' : 'warning',
      message: `${result.summary.total_conflicts} conflict${result.summary.total_conflicts !== 1 ? 's' : ''} detected`,
      details: `${result.summary.critical_conflicts} critical and ${result.summary.total_conflicts - result.summary.critical_conflicts} other conflicts need resolution.`,
    })
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-rose-400" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-400" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-400" />
      default:
        return null
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'border-rose-500/30 bg-rose-500/10'
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10'
      case 'info':
        return 'border-blue-500/30 bg-blue-500/10'
      default:
        return 'border-white/[0.1] bg-white/[0.05]'
    }
  }

  if (risks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">✓</div>
          <div>
            <p className="text-sm font-medium text-emerald-300">No significant data loss risks detected</p>
            <p className="text-xs text-emerald-200/60 mt-1">However, always test migrations in a staging environment first</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-medium text-white/80">Data Loss Risks</h4>
        <span className="text-xs px-2 py-1 rounded bg-white/[0.1] text-white/60">
          {risks.length} item{risks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {risks.map((risk, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className={`rounded-lg border p-3 ${getRiskColor(risk.level)}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{getRiskIcon(risk.level)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{risk.message}</p>
              <p className="text-xs text-white/60 mt-1">{risk.details}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mt-4">
        <p className="text-xs text-amber-200">
          <span className="font-medium">Recommendation:</span> Always test migrations in a staging environment and maintain backups before running in production.
        </p>
      </div>
    </div>
  )
}
