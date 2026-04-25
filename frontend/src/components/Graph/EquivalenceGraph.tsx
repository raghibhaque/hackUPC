import { motion } from 'framer-motion'
import type { ReconciliationResult } from '../../types'
import { cn } from '@/lib/utils'

interface Props { result: ReconciliationResult }

export default function EquivalenceGraph({ result }: Props) {
  const { table_mappings } = result

  if (table_mappings.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-6 py-16 text-center">
        <p className="text-sm text-white/25">No mappings to visualise</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white/80">Equivalence Graph</h2>
          <p className="mt-0.5 text-xs text-white/30">
            {table_mappings.length} matched pairs · {table_mappings.reduce((s, m) => s + m.column_mappings.length, 0)} column mappings
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-white/30">
          <LegendDot color="bg-indigo-400/60" label="Source" />
          <LegendDot color="bg-violet-400/60" label="Target" />
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[1fr_80px_1fr] gap-3 px-1">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-300/50">Source</p>
        <div />
        <p className="text-xs font-medium uppercase tracking-wider text-violet-300/50">Target</p>
      </div>

      {/* Mapping rows */}
      <div className="space-y-2">
        {table_mappings.map((m, i) => {
          const pct = Math.round(m.confidence * 100)
          const label = m.confidence_label
          const lineColor =
            label === 'HIGH' ? '#34d399' : label === 'MEDIUM' ? '#fbbf24' : '#f43f5e'

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="grid grid-cols-[1fr_80px_1fr] items-center gap-3"
            >
              {/* Source */}
              <TableNode
                name={m.table_a.name}
                cols={m.table_a.columns.length}
                color="indigo"
                align="right"
              />

              {/* Connector */}
              <div className="flex flex-col items-center gap-1">
                <svg width="80" height="24" viewBox="0 0 80 24" className="overflow-visible">
                  <motion.line
                    x1="0" y1="12" x2="80" y2="12"
                    stroke={lineColor}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.04 }}
                  />
                  <polygon points="72,8 80,12 72,16" fill={lineColor} fillOpacity="0.4" />
                </svg>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: lineColor, opacity: 0.7 }}>
                  {pct}%
                </span>
              </div>

              {/* Target */}
              <TableNode
                name={m.table_b.name}
                cols={m.table_b.columns.length}
                color="violet"
                align="left"
              />
            </motion.div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.05] pt-5">
        <FooterStat label="Nodes" value={String(table_mappings.length * 2)} />
        <FooterStat label="Edges" value={String(table_mappings.length)} />
        <FooterStat
          label="Avg weight"
          value={`${(table_mappings.reduce((s, m) => s + m.confidence, 0) / table_mappings.length * 100).toFixed(0)}%`}
        />
      </div>
    </div>
  )
}

function TableNode({
  name, cols, color, align,
}: {
  name: string
  cols: number
  color: 'indigo' | 'violet'
  align: 'left' | 'right'
}) {
  const border = color === 'indigo' ? 'border-indigo-500/25 bg-indigo-500/[0.06]' : 'border-violet-500/25 bg-violet-500/[0.06]'
  const nameColor = color === 'indigo' ? 'text-indigo-200/80' : 'text-violet-200/80'

  return (
    <div className={cn(
      'rounded-lg border px-3 py-2.5',
      border,
      align === 'right' ? 'text-right' : 'text-left'
    )}>
      <p className={cn('text-sm font-medium truncate', nameColor)}>{name}</p>
      <p className="mt-0.5 text-xs text-white/25">{cols} columns</p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('h-2 w-2 rounded-full', color)} />
      <span>{label}</span>
    </div>
  )
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-center">
      <p className="text-xs text-white/30">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-white/60 tabular-nums">{value}</p>
    </div>
  )
}
