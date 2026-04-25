import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ReconciliationResult } from '../../types'
import {
  calculateBusinessImpactMetrics,
  getTopIssues,
  formatTimeSaved,
  type BusinessImpactMetrics,
} from '../../lib/businessImpactCalculations'

interface Props {
  result: ReconciliationResult
}

export default function BusinessImpactDashboard({ result }: Props) {
  const metrics = useMemo(() => calculateBusinessImpactMetrics(result), [result])
  const topIssues = useMemo(() => getTopIssues(result, 6), [result])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white">Business Impact</h2>
        </div>
        <p className="text-sm text-white/60">
          Estimated value and effort savings from automated reconciliation
        </p>
      </motion.div>

      {/* Primary Metrics Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        {/* Auto-Resolved % - Primary KPI */}
        <MetricCard
          variants={itemVariants}
          value={`${metrics.autoResolvedPercentage}%`}
          label="Auto-Resolved"
          description="High confidence mappings"
          icon={CheckCircle}
          color="emerald"
          subText={`${metrics.autoResolvedCount}/${metrics.totalMappings}`}
        />

        {/* Needs Review */}
        <MetricCard
          variants={itemVariants}
          value={metrics.needsReviewCount}
          label="Needs Review"
          description="Medium confidence or minor issues"
          icon={AlertCircle}
          color="amber"
          subText={`${Math.round((metrics.needsReviewCount / metrics.totalMappings) * 100)}% of total`}
        />

        {/* High Risk */}
        <MetricCard
          variants={itemVariants}
          value={metrics.highRiskCount}
          label="High Risk"
          description="Low confidence or major conflicts"
          icon={AlertTriangle}
          color="rose"
          subText={`${metrics.conflictCount} conflicts detected`}
        />

        {/* Time Saved */}
        <MetricCard
          variants={itemVariants}
          value={`${metrics.estimatedTimeSavedHours}h`}
          label="Time Saved"
          description="Estimated manual effort eliminated"
          icon={Clock}
          color="indigo"
          subText={`${metrics.estimatedTimeSavedMinutes} minutes`}
        />

        {/* Total Analyzed */}
        <MetricCard
          variants={itemVariants}
          value={metrics.totalMappings}
          label="Mappings"
          description="Total analyzed and reconciled"
          icon={TrendingUp}
          color="cyan"
          subText={`${metrics.totalUnmappedColumns} unmapped columns`}
        />
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
            Reconciliation Progress
          </p>
          <p className="text-xs font-semibold text-white/50">
            {Math.round((metrics.autoResolvedCount + metrics.needsReviewCount) / metrics.totalMappings * 100)}% complete
          </p>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.05] border border-white/[0.1]">
          <div className="absolute inset-y-0 left-0 flex h-full">
            {/* Auto-resolved segment (green) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.autoResolvedCount / metrics.totalMappings) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
            {/* Needs review segment (amber) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.needsReviewCount / metrics.totalMappings) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className="bg-gradient-to-r from-amber-500 to-amber-400"
            />
            {/* High risk segment (red) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.highRiskCount / metrics.totalMappings) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
              className="bg-gradient-to-r from-rose-500 to-rose-400"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-full bg-emerald-500" />
            <span className="text-white/60">Auto-resolved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-full bg-amber-500" />
            <span className="text-white/60">Needs review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-full bg-rose-500" />
            <span className="text-white/60">High risk</span>
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-white/80">Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatRow
            label="Average Confidence"
            value={`${Math.round(metrics.averageConfidence * 100)}%`}
            color="text-cyan-300"
          />
          <StatRow
            label="Conflict Count"
            value={metrics.conflictCount.toString()}
            color={metrics.conflictCount > 0 ? 'text-rose-300' : 'text-white/60'}
          />
          <StatRow
            label="Unmapped Columns"
            value={metrics.totalUnmappedColumns.toString()}
            color={metrics.totalUnmappedColumns > 0 ? 'text-amber-300' : 'text-white/60'}
          />
          <StatRow
            label="Success Rate"
            value={`${Math.round((metrics.autoResolvedCount / metrics.totalMappings) * 100)}%`}
            color="text-emerald-300"
          />
        </div>
      </motion.div>

      {/* Top Issues Section */}
      {topIssues.length > 0 && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Top Issues Requiring Attention
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {topIssues.map((issue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'rounded-lg border p-3 space-y-2 transition-all hover:border-white/[0.15]',
                  issue.severity === 'critical'
                    ? 'border-rose-500/30 bg-rose-500/10'
                    : issue.severity === 'high'
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-yellow-500/30 bg-yellow-500/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">
                      {issue.sourceTable} → {issue.targetTable}
                    </p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      {issue.type === 'low_confidence'
                        ? 'Low confidence mapping'
                        : `${issue.conflictCount} conflict${issue.conflictCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {issue.type === 'low_confidence' ? (
                      <div className="text-xs font-semibold text-white/80">
                        {Math.round(issue.confidence * 100)}%
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-white/80">
                        {issue.conflictCount}
                      </div>
                    )}
                    <div
                      className={cn(
                        'text-[10px] font-medium mt-0.5',
                        issue.severity === 'critical'
                          ? 'text-rose-300'
                          : issue.severity === 'high'
                            ? 'text-amber-300'
                            : 'text-yellow-300'
                      )}
                    >
                      {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Confidence bar for this mapping */}
                {issue.confidence > 0 && (
                  <div className="h-1 w-full rounded-full bg-white/[0.1] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${issue.confidence * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={cn(
                        'h-full',
                        issue.confidence > 0.85
                          ? 'bg-emerald-500'
                          : issue.confidence > 0.5
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      )}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {metrics.totalMappings === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-white/50"
        >
          <p className="text-sm">Upload schemas to see business impact analysis</p>
        </motion.div>
      )}
    </motion.div>
  )
}

interface MetricCardProps {
  value: string | number
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan'
  subText?: string
  variants?: any
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'text-emerald-500/60',
  },
  amber: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    icon: 'text-amber-500/60',
  },
  rose: {
    bg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-400',
    icon: 'text-rose-500/60',
  },
  indigo: {
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    text: 'text-indigo-400',
    icon: 'text-indigo-500/60',
  },
  cyan: {
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    text: 'text-cyan-400',
    icon: 'text-cyan-500/60',
  },
}

function MetricCard({
  value,
  label,
  description,
  icon: Icon,
  color,
  subText,
  variants,
}: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <motion.div
      variants={variants}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-all',
        colors.bg
      )}
    >
      <div className="flex items-start justify-between">
        <Icon className={cn('h-4 w-4', colors.icon)} />
      </div>

      <div className="space-y-1">
        <p className={cn('text-2xl sm:text-3xl font-bold', colors.text)}>
          {value}
        </p>
        <p className="text-xs font-semibold text-white/70">{label}</p>
        <p className="text-[10px] text-white/50 leading-tight">{description}</p>
        {subText && <p className="text-[10px] text-white/40 font-mono">{subText}</p>}
      </div>
    </motion.div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-white/50 font-medium">{label}</p>
      <p className={cn('text-sm font-semibold', color)}>{value}</p>
    </div>
  )
}
