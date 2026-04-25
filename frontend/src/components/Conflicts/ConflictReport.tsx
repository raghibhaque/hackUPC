import { useState } from 'react'
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
  error:   {
    icon: XCircle,
    label: 'Error',
    border: 'border-rose-500/30',
    bg: 'bg-gradient-to-br from-rose-500/12 to-rose-600/4',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    glow: 'shadow-[0_8px_24px_rgba(244,63,94,0.15)]',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    border: 'border-amber-500/30',
    bg: 'bg-gradient-to-br from-amber-500/12 to-amber-600/4',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    glow: 'shadow-[0_8px_24px_rgba(217,119,6,0.15)]',
  },
  info: {
    icon: Info,
    label: 'Info',
    border: 'border-blue-500/30',
    bg: 'bg-gradient-to-br from-blue-500/12 to-blue-600/4',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
    glow: 'shadow-[0_8px_24px_rgba(59,130,246,0.15)]',
  },
}

type Severity = keyof typeof SEVERITY_META

export default function ConflictReport({ result }: Props) {
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set(['error', 'warning', 'info']))

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

  const toggleSeverity = (severity: Severity) => {
    const newSet = new Set(selectedSeverities)
    if (newSet.has(severity)) {
      newSet.delete(severity)
    } else {
      newSet.add(severity)
    }
    setSelectedSeverities(newSet)
  }

  const groups = (['error', 'warning', 'info'] as Severity[]).map(sev => ({
    sev,
    items: allConflicts.filter(c => c.severity === sev),
  })).filter(g => g.items.length > 0 && selectedSeverities.has(g.sev))

  const total = result.summary.total_conflicts
  const critical = result.summary.critical_conflicts

  return (
    <div className="space-y-6">

      {/* Severity filters */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2.5"
      >
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Filter by:</span>
        {(['error', 'warning', 'info'] as Severity[]).map((severity, idx) => {
          const meta = SEVERITY_META[severity]
          const isSelected = selectedSeverities.has(severity)
          return (
            <motion.button
              key={severity}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleSeverity(severity)}
              className={cn(
                'relative overflow-hidden flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all',
                isSelected
                  ? `${meta.border} ${meta.bg} ${meta.text} ${meta.glow}`
                  : 'border border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.15] hover:bg-white/[0.08]'
              )}
            >
              <motion.div
                animate={{ scale: isSelected ? [1, 1.3, 1] : 1 }}
                transition={{ duration: isSelected ? 0.4 : 0 }}
                className={cn('h-2 w-2 rounded-full', meta.dot)}
              />
              {meta.label}
              <span className="text-[10px] opacity-60">({selectedSeverities.has(severity) ? allConflicts.filter(c => c.severity === severity).length : 0})</span>
            </motion.button>
          )
        })}
      </motion.div>

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
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.05 }}
                      whileHover={{ x: 4, scale: 1.01 }}
                      className={cn(
                        'relative overflow-hidden rounded-lg border px-4 py-3.5 backdrop-blur-sm transition-all',
                        meta.border,
                        meta.bg,
                        meta.glow,
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                          className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', meta.dot)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <code className="font-mono bg-white/[0.05] rounded px-1.5 py-0.5 text-white/60">{item.tableName}</code>
                            <span className="text-white/20">→</span>
                            <code className={cn('font-mono font-semibold bg-white/[0.05] rounded px-1.5 py-0.5', meta.text)}>{item.columnPair}</code>
                          </div>
                          {item.description && (
                            <p className="mt-2 text-xs text-white/50 leading-relaxed font-medium">
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
    amber: {
      border: 'border-amber-500/30',
      bg: 'bg-gradient-to-br from-amber-500/12 to-amber-600/4',
      text: 'text-amber-300',
      glow: 'shadow-[0_8px_24px_rgba(217,119,6,0.15)]',
    },
    rose: {
      border: 'border-rose-500/30',
      bg: 'bg-gradient-to-br from-rose-500/12 to-rose-600/4',
      text: 'text-rose-300',
      glow: 'shadow-[0_8px_24px_rgba(244,63,94,0.15)]',
    },
    neutral: {
      border: 'border-white/[0.08]',
      bg: 'bg-gradient-to-br from-white/[0.04] to-white/[0.01]',
      text: 'text-white/40',
      glow: 'shadow-[0_8px_24px_rgba(255,255,255,0.05)]',
    },
  }
  const c = colors[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-xl border px-5 py-4 text-center min-w-[100px] backdrop-blur-sm',
        c.border,
        c.bg,
        c.glow
      )}
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn('text-3xl font-bold tabular-nums', c.text)}
      >
        {value}
      </motion.p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-widest opacity-70">{label}</p>
    </motion.div>
  )
}
