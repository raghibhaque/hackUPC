import { motion } from 'framer-motion'
import { TrendingUp, AlertCircle, Zap, BarChart3 } from 'lucide-react'
import type { ReconciliationResult } from '../../types'
import { cn } from '@/lib/utils'
import ConfidenceBadge from '../shared/ConfidenceBadge'
import ReconciliationStats from '../shared/ReconciliationStats'
import ExportResults from '../shared/ExportResults'
import BusinessImpactDashboard from './BusinessImpactDashboard'

interface Props { result: ReconciliationResult }

export default function AnalyticsView({ result }: Props) {
  const { summary, table_mappings } = result
  const confidences = table_mappings.map(m => Math.round(m.confidence * 100))
  const avgConfidence = summary.average_confidence
  const matchRate = (summary.tables_matched / summary.tables_in_a * 100).toFixed(1)

  // Confidence distribution
  const bins = { excellent: 0, good: 0, fair: 0, poor: 0 }
  confidences.forEach(c => {
    if (c >= 90) bins.excellent++
    else if (c >= 70) bins.good++
    else if (c >= 50) bins.fair++
    else bins.poor++
  })

  // Top unmatched
  const topUnmatched = result.unmatched_tables_a.slice(0, 5)

  // Conflict distribution
  const conflictsByType: Record<string, number> = {}
  result.table_mappings.forEach(tm =>
    tm.column_mappings.forEach(cm =>
      cm.conflicts.forEach((c: any) => {
        const type = c.severity ?? 'info'
        conflictsByType[type] = (conflictsByType[type] ?? 0) + 1
      })
    )
  )

  return (
    <div className="space-y-6">

      {/* Reconciliation Stats */}
      <ReconciliationStats result={result} />

      {/* Business Impact Dashboard */}
      <BusinessImpactDashboard result={result} />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          icon={<TrendingUp className="h-4 w-4" />}
          label="Match rate"
          value={`${matchRate}%`}
          accent="indigo"
        />
        <KPI
          label="Avg confidence"
          value={`${(avgConfidence * 100).toFixed(0)}%`}
          accent="violet"
        />
        <KPI
          label="Matched pairs"
          value={String(summary.tables_matched)}
          accent="emerald"
        />
        <KPI
          label="Unmatched tables"
          value={String(result.unmatched_tables_a.length)}
          accent={result.unmatched_tables_a.length > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Confidence Distribution */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/80">Confidence Distribution</h3>
        <div className="space-y-3">
          {[
            { label: 'Excellent (90%+)', count: bins.excellent, color: 'emerald' },
            { label: 'Good (70-89%)',    count: bins.good,      color: 'cyan'    },
            { label: 'Fair (50-69%)',    count: bins.fair,      color: 'amber'   },
            { label: 'Poor (<50%)',      count: bins.poor,      color: 'rose'    },
          ].map(({ label, count, color }) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-white/50">{label}</span>
                <span className={cn(
                  'font-semibold',
                  color === 'emerald' ? 'text-emerald-300' :
                  color === 'cyan' ? 'text-cyan-300' :
                  color === 'amber' ? 'text-amber-300' : 'text-rose-300'
                )}>
                  {count}
                </span>
              </div>
              <ProgressBar pct={(count / table_mappings.length) * 100} color={color} />
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-3 md:grid-cols-2">

        {/* Conflict summary */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white/80">Conflicts by severity</h3>
          {summary.total_conflicts === 0 ? (
            <p className="text-xs text-white/25">No conflicts detected</p>
          ) : (
            <div className="space-y-2.5">
              {[
                { sev: 'error',   label: 'Errors',   color: 'rose'   },
                { sev: 'warning', label: 'Warnings', color: 'amber'  },
                { sev: 'info',    label: 'Info',     color: 'blue'   },
              ].map(({ sev, label, color }) => {
                const count = conflictsByType[sev] ?? 0
                return count > 0 && (
                  <motion.div key={sev} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        color === 'rose' ? 'bg-rose-400' :
                        color === 'amber' ? 'bg-amber-400' : 'bg-blue-400'
                      )} />
                      <span className="text-xs text-white/40">{label}</span>
                      <span className={cn(
                        'ml-auto text-xs font-semibold',
                        color === 'rose' ? 'text-rose-300' :
                        color === 'amber' ? 'text-amber-300' : 'text-blue-300'
                      )}>
                        {count}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Unmatched tables */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white/80">
            Unmatched tables
            {result.unmatched_tables_a.length > 0 && (
              <AlertCircle className="ml-2 inline-block h-4 w-4 text-amber-400" />
            )}
          </h3>
          {result.unmatched_tables_a.length === 0 ? (
            <p className="text-xs text-white/25">All tables matched</p>
          ) : (
            <div className="space-y-1.5 text-xs">
              {topUnmatched.map(t => (
                <motion.code
                  key={t}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="block rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-300/70"
                >
                  {t}
                </motion.code>
              ))}
              {result.unmatched_tables_a.length > 5 && (
                <p className="pt-1 text-white/25">
                  +{result.unmatched_tables_a.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export Results */}
      <ExportResults result={result} />

      {/* Score breakdown */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
          <BarChart3 className="h-4 w-4" />
          Accuracy Score Composition
        </h3>
        <div className="space-y-4">
          {/* Structural vs Semantic */}
          <div className="grid grid-cols-2 gap-4">
            <ScoreBox
              label="Structural Accuracy"
              value={(result.table_mappings.reduce((s, m) => s + m.structural_score, 0) / result.table_mappings.length).toFixed(2)}
              help="Table structure similarity (keys, columns, types)"
              color="indigo"
            />
            <ScoreBox
              label="Semantic Accuracy"
              value={(result.table_mappings.reduce((s, m) => s + m.semantic_score, 0) / result.table_mappings.length).toFixed(2)}
              help="Name & meaning similarity"
              color="violet"
            />
          </div>

          {/* Top matches */}
          <div className="pt-3 border-t border-white/[0.06]">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/40">Highest confidence matches</p>
            <div className="space-y-1.5">
              {result.table_mappings
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 3)
                .map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-white/40">
                      {m.table_a.name} → {m.table_b.name}
                    </span>
                    <ConfidenceBadge value={m.confidence} showPercent={true} />
                  </motion.div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <p className="text-xs leading-relaxed text-white/35">
          <Zap className="mb-1 inline-block h-3 w-3 text-amber-400" /> This reconciliation matched{' '}
          <span className="font-semibold text-white/50">{summary.tables_matched} of {summary.tables_in_a}</span>{' '}
          source tables with an average confidence of{' '}
          <span className="font-semibold text-white/50">{(avgConfidence * 100).toFixed(1)}%</span>. Review the{' '}
          <span className="font-semibold text-white/50">Conflicts</span> tab to address issues before migration.
        </p>
      </div>
    </div>
  )
}

function KPI({
  icon, label, value, accent,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  accent: 'indigo' | 'violet' | 'emerald' | 'amber' | 'slate'
}) {
  const colors = {
    indigo: {
      border: 'border-indigo-500/30',
      bg: 'bg-gradient-to-br from-indigo-500/12 to-indigo-600/4',
      text: 'text-indigo-300',
      icon: 'text-indigo-400/70',
      glow: 'shadow-[0_8px_24px_rgba(99,102,241,0.15)]',
    },
    violet: {
      border: 'border-violet-500/30',
      bg: 'bg-gradient-to-br from-violet-500/12 to-violet-600/4',
      text: 'text-violet-300',
      icon: 'text-violet-400/70',
      glow: 'shadow-[0_8px_24px_rgba(139,92,246,0.15)]',
    },
    emerald: {
      border: 'border-emerald-500/30',
      bg: 'bg-gradient-to-br from-emerald-500/12 to-emerald-600/4',
      text: 'text-emerald-300',
      icon: 'text-emerald-400/70',
      glow: 'shadow-[0_8px_24px_rgba(16,185,129,0.15)]',
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'bg-gradient-to-br from-amber-500/12 to-amber-600/4',
      text: 'text-amber-300',
      icon: 'text-amber-400/70',
      glow: 'shadow-[0_8px_24px_rgba(217,119,6,0.15)]',
    },
    slate: {
      border: 'border-white/[0.08]',
      bg: 'bg-gradient-to-br from-white/[0.04] to-white/[0.01]',
      text: 'text-white/40',
      icon: 'text-white/25',
      glow: 'shadow-[0_8px_24px_rgba(255,255,255,0.05)]',
    },
  }

  const c = colors[accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 backdrop-blur-sm transition-all',
        c.border,
        c.bg,
        c.glow
      )}
    >
      {/* Animated corner accent */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{
        background: accent === 'indigo' ? 'radial-gradient(circle, #6366f1, transparent)' :
                   accent === 'violet' ? 'radial-gradient(circle, #8b5cf6, transparent)' :
                   accent === 'emerald' ? 'radial-gradient(circle, #10b981, transparent)' :
                   accent === 'amber' ? 'radial-gradient(circle, #d97706, transparent)' :
                   'radial-gradient(circle, rgba(255,255,255,0.1), transparent)',
      }} />

      <div className="relative z-10">
        {icon && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className={cn('mb-3', c.icon)}
          >
            {icon}
          </motion.div>
        )}
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</p>
        <motion.p
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className={cn('mt-2 text-2xl font-bold tabular-nums', c.text)}
        >
          {value}
        </motion.p>
      </div>
    </motion.div>
  )
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const getStyles = () => {
    switch (color) {
      case 'emerald':
        return {
          gradient: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
        }
      case 'cyan':
        return {
          gradient: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
          glow: 'shadow-[0_0_12px_rgba(34,211,238,0.4)]',
        }
      case 'amber':
        return {
          gradient: 'bg-gradient-to-r from-amber-500 to-amber-400',
          glow: 'shadow-[0_0_12px_rgba(217,119,6,0.4)]',
        }
      case 'rose':
        return {
          gradient: 'bg-gradient-to-r from-rose-500 to-rose-400',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]',
        }
      default:
        return {
          gradient: 'bg-gradient-to-r from-blue-500 to-blue-400',
          glow: 'shadow-[0_0_12px_rgba(59,130,246,0.4)]',
        }
    }
  }

  const styles = getStyles()

  return (
    <div className="overflow-hidden rounded-full bg-gradient-to-r from-white/[0.08] to-white/[0.04] p-0.5">
      <motion.div
        className={cn('h-1 rounded-full', styles.gradient, styles.glow)}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: `${pct}%`, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

function ScoreBox({ label, value, help, color }: { label: string; value: string; help: string; color: 'indigo' | 'violet' }) {
  const getStyles = () => {
    if (color === 'indigo') {
      return {
        border: 'border-indigo-500/30',
        bg: 'bg-gradient-to-br from-indigo-500/12 to-indigo-600/4',
        text: 'text-indigo-300',
        icon: 'text-indigo-400/60',
        glow: 'shadow-[0_8px_24px_rgba(99,102,241,0.12)]',
      }
    }
    return {
      border: 'border-violet-500/30',
      bg: 'bg-gradient-to-br from-violet-500/12 to-violet-600/4',
      text: 'text-violet-300',
      icon: 'text-violet-400/60',
      glow: 'shadow-[0_8px_24px_rgba(139,92,246,0.12)]',
    }
  }

  const s = getStyles()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={cn('relative overflow-hidden rounded-lg border p-3.5 text-center backdrop-blur-sm transition-all', s.border, s.bg, s.glow)}
      title={help}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      <motion.p
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn('mt-2 text-2xl font-bold tabular-nums', s.text)}
      >
        {value}
      </motion.p>
      <p className="mt-1.5 text-[10px] font-medium opacity-60">{help}</p>
    </motion.div>
  )
}
