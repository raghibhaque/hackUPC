import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ArrowRight, AlertTriangle } from 'lucide-react'
import type { ReconciliationResult, TableMapping } from '../../types'
import { cn } from '@/lib/utils'

interface Props { result: ReconciliationResult }

export default function MappingTable({ result }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    const s = new Set(expanded)
    s.has(i) ? s.delete(i) : s.add(i)
    setExpanded(s)
  }

  const { tables_matched, tables_in_a, average_confidence, total_conflicts } = result.summary

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Tables matched" value={`${tables_matched} / ${tables_in_a}`} />
        <Stat label="Avg confidence" value={`${(average_confidence * 100).toFixed(0)}%`} accent />
        <Stat label="Conflicts" value={String(total_conflicts)} warn={total_conflicts > 0} />
      </div>

      {/* Mappings */}
      {result.table_mappings.length === 0 ? (
        <Empty message="No table mappings found" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.07]">
          {result.table_mappings.map((m, i) => (
            <Row key={i} mapping={m} index={i} isExpanded={expanded.has(i)} onToggle={() => toggle(i)} isLast={i === result.table_mappings.length - 1} />
          ))}
        </div>
      )}

      {/* Unmatched tables */}
      {result.unmatched_tables_a.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" />
            <div>
              <p className="text-sm font-medium text-amber-300/80">
                {result.unmatched_tables_a.length} unmatched table{result.unmatched_tables_a.length !== 1 ? 's' : ''} — manual mapping needed
              </p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {result.unmatched_tables_a.map(t => (
                  <code key={t} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300/70">
                    {t}
                  </code>
                ))}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function Row({ mapping, index, isExpanded, onToggle, isLast }: {
  mapping: TableMapping
  index: number
  isExpanded: boolean
  onToggle: () => void
  isLast: boolean
}) {
  const pct = Math.round(mapping.confidence * 100)
  const label = mapping.confidence_label

  return (
    <div className={cn(!isLast && 'border-b border-white/[0.05]')}>
      <motion.button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
        initial={false}
      >
        {/* Index */}
        <span className="w-5 shrink-0 text-xs text-white/20">{index + 1}</span>

        {/* Source → Target */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <TableName name={mapping.table_a.name} cols={mapping.table_a.columns.length} color="indigo" />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/20" />
          <TableName name={mapping.table_b.name} cols={mapping.table_b.columns.length} color="violet" />
        </div>

        {/* Confidence */}
        <div className="flex shrink-0 items-center gap-3">
          <ConfBar pct={pct} label={label} />
          <ChevronDown className={cn('h-4 w-4 text-white/25 transition-transform', isExpanded && 'rotate-180')} />
        </div>
      </motion.button>

      {/* Expanded column mappings */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] bg-white/[0.015] px-5 pb-4 pt-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/25">
                Column mappings · {mapping.column_mappings.length}
              </p>
              <div className="space-y-1.5">
                {mapping.column_mappings.map((col, ci) => (
                  <div key={ci} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.025] px-3 py-2 text-xs">
                    <code className="text-indigo-300/80">{col.col_a.name}</code>
                    <span className="text-white/[0.15]">·</span>
                    <code className="text-white/30">{col.col_a.data_type.base_type}</code>
                    <ArrowRight className="h-3 w-3 text-white/15 shrink-0" />
                    <code className="text-violet-300/80">{col.col_b.name}</code>
                    <span className="text-white/[0.15]">·</span>
                    <code className="text-white/30">{col.col_b.data_type.base_type}</code>
                    <span className="ml-auto text-white/25">{(col.confidence * 100).toFixed(0)}%</span>
                    {col.conflicts.length > 0 && (
                      <AlertTriangle className="h-3 w-3 text-amber-400/60" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TableName({ name, cols, color }: { name: string; cols: number; color: 'indigo' | 'violet' }) {
  return (
    <div className="min-w-0 flex-1">
      <p className={cn('truncate text-sm font-medium', color === 'indigo' ? 'text-indigo-200/90' : 'text-violet-200/90')}>
        {name}
      </p>
      <p className="text-xs text-white/25">{cols} cols</p>
    </div>
  )
}

function ConfBar({ pct, label }: { pct: number; label: string }) {
  const colors = {
    HIGH:   { bar: 'bg-emerald-400', text: 'text-emerald-300' },
    MEDIUM: { bar: 'bg-amber-400',   text: 'text-amber-300'   },
    LOW:    { bar: 'bg-rose-400',    text: 'text-rose-300'    },
  }
  const c = colors[label as keyof typeof colors] ?? colors.LOW

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={cn('h-full rounded-full', c.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        />
      </div>
      <span className={cn('w-8 text-right text-xs font-semibold tabular-nums', c.text)}>
        {pct}%
      </span>
    </div>
  )
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
      <p className="text-xs text-white/35">{label}</p>
      <p className={cn(
        'mt-1 text-xl font-bold tabular-nums',
        warn ? 'text-amber-300' : accent ? 'text-indigo-300' : 'text-white/80'
      )}>
        {value}
      </p>
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-6 py-12 text-center">
      <p className="text-sm text-white/25">{message}</p>
    </div>
  )
}
