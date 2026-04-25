import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import type { ReconciliationResult } from '../../types'
import { cn } from '@/lib/utils'

interface Props { result: ReconciliationResult }

interface ConflictItem {
  tableName: string
  columnPair: string
  severity: string
  description: string
}

const SEVERITY_META = {
  error:   { icon: XCircle,       label: 'Error',   border: 'border-rose-500/20',   bg: 'bg-rose-500/[0.06]',   text: 'text-rose-300/80',   dot: 'bg-rose-400'   },
  warning: { icon: AlertTriangle, label: 'Warning', border: 'border-amber-500/20',  bg: 'bg-amber-500/[0.06]',  text: 'text-amber-300/80',  dot: 'bg-amber-400'  },
  info:    { icon: Info,          label: 'Info',    border: 'border-blue-500/20',   bg: 'bg-blue-500/[0.06]',   text: 'text-blue-300/80',   dot: 'bg-blue-400'   },
}

type Severity = keyof typeof SEVERITY_META

export default function ConflictReport({ result }: Props) {
  const allConflicts: ConflictItem[] = result.table_mappings.flatMap(table =>
    table.column_mappings.flatMap(col =>
      col.conflicts.map((c: unknown) => {
        const conflict = c as { severity?: string; description?: string }
        return {
          tableName: `${table.table_a.name} → ${table.table_b.name}`,
          columnPair: `${col.col_a.name} → ${col.col_b.name}`,
          severity: conflict.severity ?? 'info',
          description: conflict.description ?? JSON.stringify(c),
        }
      })
    )
  )

  const groups = (['error', 'warning', 'info'] as Severity[]).map(sev => ({
    sev,
    items: allConflicts.filter(c => c.severity === sev),
  })).filter(g => g.items.length > 0)

  const total = result.summary.total_conflicts
  const critical = result.summary.critical_conflicts

  return (
    <div className="space-y-6">

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <SummaryChip value={total}    label="total"    color={total > 0 ? 'amber' : 'neutral'} />
        <SummaryChip value={critical} label="critical" color={critical > 0 ? 'rose' : 'neutral'} />
      </div>

      {total === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-6 py-12 text-center"
        >
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-400/60" />
          <p className="text-base font-medium text-emerald-300/70">No conflicts detected</p>
          <p className="mt-1 text-sm text-white/25">The schemas are fully compatible</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ sev, items }) => {
            const meta = SEVERITY_META[sev]
            const Icon = meta.icon
            return (
              <div key={sev} className="space-y-2">
                {/* Group header */}
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-3.5 w-3.5', meta.text)} />
                  <span className={cn('text-xs font-semibold uppercase tracking-wider', meta.text)}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-white/20">({items.length})</span>
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.04 }}
                      className={cn(
                        'rounded-lg border px-4 py-3',
                        meta.border,
                        meta.bg,
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <code className="text-white/50">{item.tableName}</code>
                            <span className="text-white/15">·</span>
                            <code className={cn('font-medium', meta.text)}>{item.columnPair}</code>
                          </div>
                          {item.description && (
                            <p className="mt-1 text-xs text-white/35 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryChip({ value, label, color }: { value: number; label: string; color: 'amber' | 'rose' | 'neutral' }) {
  const colors = {
    amber:   'border-amber-500/20 bg-amber-500/[0.07] text-amber-300',
    rose:    'border-rose-500/20  bg-rose-500/[0.07]  text-rose-300',
    neutral: 'border-white/[0.06] bg-white/[0.03]     text-white/30',
  }
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-center min-w-[88px]', colors[color])}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider opacity-70">{label}</p>
    </div>
  )
}
