import { motion } from 'framer-motion'
import { TrendingUp, AlertCircle, Zap } from 'lucide-react'
import type { ReconciliationResult } from '../../types'
import { cn } from '@/lib/utils'

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

      {/* Summary */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
        <p className="text-xs leading-relaxed text-white/35">
          <Zap className="mb-1 inline-block h-3 w-3 text-amber-400" /> This reconciliation matched{' '}
          <span className="font-semibold text-white/50">{summary.tables_matched} of {summary.tables_in_a}</span>{' '}
          source tables with an average confidence of{' '}
          <span className="font-semibold text-white/50">{(avgConfidence * 100).toFixed(0)}%</span>. Review the{' '}
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
    indigo: 'border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-300',
    violet: 'border-violet-500/20 bg-violet-500/[0.06] text-violet-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300',
    slate: 'border-white/[0.06] bg-white/[0.03] text-white/30',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border p-4', colors[accent])}
    >
      {icon && <div className="mb-2 text-white/40">{icon}</div>}
      <p className="text-[11px] font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
    </motion.div>
  )
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const bgColor =
    color === 'emerald' ? 'bg-emerald-400/40' :
    color === 'cyan' ? 'bg-cyan-400/40' :
    color === 'amber' ? 'bg-amber-400/40' : 'bg-rose-400/40'

  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-white/[0.06]')}>
      <motion.div
        className={bgColor}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}
