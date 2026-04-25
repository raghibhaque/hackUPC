import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ReconciliationResult } from '../../types'

interface Props {
  result: ReconciliationResult
}

interface StatMetric {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'stable'
  help?: string
}

export default function StatisticsDashboard({ result }: Props) {
  const metrics = useMemo(() => {
    if (!result.table_mappings || result.table_mappings.length === 0) {
      return []
    }

    const tableCount = result.table_mappings.length
    let totalSourceColumns = 0
    let totalTargetColumns = 0
    let totalMappedColumns = 0
    let totalTypeConflicts = 0
    let totalHighConfidence = 0 // confidence >= 0.9
    let totalMediumConfidence = 0 // 0.7 <= confidence < 0.9
    let totalLowConfidence = 0 // confidence < 0.7

    result.table_mappings.forEach(mapping => {
      totalSourceColumns += mapping.table_a.columns.length
      totalTargetColumns += mapping.table_b.columns.length
      totalMappedColumns += mapping.column_mappings?.length || 0

      // Count type conflicts
      const conflicts = (mapping.column_mappings || []).filter(cm => {
        const sourceType = (cm.col_a?.data_type?.base_type || '').toLowerCase()
        const targetType = (cm.col_b?.data_type?.base_type || '').toLowerCase()
        return sourceType !== targetType && sourceType !== '' && targetType !== ''
      }).length
      totalTypeConflicts += conflicts

      // Count confidence levels
      if (mapping.confidence >= 0.9) {
        totalHighConfidence++
      } else if (mapping.confidence >= 0.7) {
        totalMediumConfidence++
      } else {
        totalLowConfidence++
      }
    })

    const unmappedColumns = Math.max(totalSourceColumns - totalMappedColumns, totalTargetColumns - totalMappedColumns)
    const mappingCompleteness = totalMappedColumns > 0 ? Math.round((totalMappedColumns / Math.max(totalSourceColumns, totalTargetColumns)) * 100) : 0
    const qualityScore = ((totalHighConfidence / tableCount) * 100 || 0).toFixed(1)
    const conflictRate = totalMappedColumns > 0 ? ((totalTypeConflicts / totalMappedColumns) * 100).toFixed(1) : '0'

    const containerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
      },
    }

    const itemVariants = {
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0 },
    }

    const metrics: StatMetric[] = [
      {
        label: 'Tables Mapped',
        value: tableCount,
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-cyan-400',
        trend: 'up',
        help: 'Total number of table pairs to reconcile',
      },
      {
        label: 'Mapping Completeness',
        value: `${mappingCompleteness}%`,
        icon: <CheckCircle className="h-5 w-5" />,
        color: 'text-emerald-400',
        trend: mappingCompleteness === 100 ? 'up' : 'stable',
        help: 'Percentage of columns successfully mapped',
      },
      {
        label: 'Quality Score',
        value: `${qualityScore}%`,
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-indigo-400',
        trend: 'stable',
        help: 'Percentage of high-confidence mappings',
      },
      {
        label: 'Type Conflicts',
        value: totalTypeConflicts,
        icon: <AlertTriangle className="h-5 w-5" />,
        color: totalTypeConflicts > 0 ? 'text-rose-400' : 'text-white/40',
        trend: totalTypeConflicts > 0 ? 'down' : 'stable',
        help: 'Number of data type mismatches',
      },
      {
        label: 'Total Columns',
        value: `${totalSourceColumns} → ${totalTargetColumns}`,
        icon: <Info className="h-5 w-5" />,
        color: 'text-violet-400',
        trend: 'stable',
        help: 'Source columns to target columns',
      },
      {
        label: 'Unmapped Columns',
        value: unmappedColumns,
        icon: <Info className="h-5 w-5" />,
        color: unmappedColumns > 0 ? 'text-amber-400' : 'text-white/40',
        trend: unmappedColumns > 0 ? 'down' : 'stable',
        help: 'Columns without mapping',
      },
    ]

    return metrics
  }, [result])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 px-4 py-2">
        <TrendingUp className="h-4 w-4 text-white/60" />
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Key Metrics</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {metrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            className="group relative rounded-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-3 hover:border-white/[0.12] transition-all cursor-help"
            title={metric.help}
          >
            {/* Background glow */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative space-y-2">
              <div className="flex items-start justify-between">
                <div className={cn('text-white/60 group-hover:text-white/80 transition-colors', metric.color)}>
                  {metric.icon}
                </div>

                {metric.trend && (
                  <div className={cn(
                    'text-xs font-semibold px-1.5 py-0.5 rounded',
                    metric.trend === 'up'
                      ? 'text-emerald-300 bg-emerald-500/10'
                      : metric.trend === 'down'
                        ? 'text-rose-300 bg-rose-500/10'
                        : 'text-white/40 bg-white/[0.05]'
                  )}>
                    {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-white/50 font-medium">{metric.label}</p>
                <p className={cn('text-lg sm:text-xl font-bold tracking-tight', metric.color)}>
                  {metric.value}
                </p>
              </div>
            </div>

            {/* Tooltip indicator */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <div className="absolute top-0 right-0 w-1 h-1 bg-white/40 rounded-full" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom insight bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-lg border border-white/[0.08] bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10 p-3"
      >
        <p className="text-xs text-white/70 leading-relaxed">
          <span className="font-semibold text-white">Pro Tip:</span> {
            result.table_mappings && result.table_mappings.length > 0
              ? 'Use the detailed statistics modal to explore column-level metrics and constraints for each table mapping.'
              : 'No table mappings found. Upload schema files to get started.'
          }
        </p>
      </motion.div>
    </motion.div>
  )
}
