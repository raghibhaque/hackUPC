import { motion } from 'framer-motion'
import { Zap, Clock, Brain, Database } from 'lucide-react'
import type { ReconciliationResult } from '../../types'

interface Props {
  result: ReconciliationResult
}

export default function PerformanceMetrics({ result }: Props) {
  const getExecutionTime = () => {
    if (!result.metadata?.execution_time_ms) return 'N/A'
    const ms = result.metadata.execution_time_ms
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getAlgorithmInfo = () => {
    const algo = result.metadata?.algorithm || 'Standard Reconciliation'
    return algo
  }

  const getConfidenceModel = () => {
    const model = result.metadata?.confidence_model || 'Semantic + Structural'
    return model
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const stats = [
    {
      label: 'Execution Time',
      value: getExecutionTime(),
      icon: Clock,
      color: 'from-blue-500 to-blue-400',
    },
    {
      label: 'Tables Analyzed',
      value: formatNumber(result.summary.tables_in_a + result.summary.tables_in_b),
      icon: Database,
      color: 'from-purple-500 to-purple-400',
    },
    {
      label: 'Mappings Generated',
      value: formatNumber(result.table_mappings?.length || 0),
      icon: Zap,
      color: 'from-amber-500 to-amber-400',
    },
    {
      label: 'Confidence Model',
      value: getConfidenceModel(),
      icon: Brain,
      color: 'from-indigo-500 to-indigo-400',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">
          Performance Metrics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">{stat.label}</p>
                  <Icon className="h-3.5 w-3.5 text-white/30" />
                </div>
                <p className="text-sm font-semibold text-white/80 truncate">{stat.value}</p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Algorithm Details */}
      {result.metadata && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <span className="text-white/50">Algorithm:</span>
            <span className="text-white/80 font-medium">{getAlgorithmInfo()}</span>
          </div>
          {result.metadata.precision_score !== undefined && (
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
              <span className="text-white/50">Precision Score:</span>
              <span className="text-white/80 font-medium">
                {(result.metadata.precision_score * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {result.metadata.recall_score !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-white/50">Recall Score:</span>
              <span className="text-white/80 font-medium">
                {(result.metadata.recall_score * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
