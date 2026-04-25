import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ArrowRight, AlertTriangle, Search, X } from 'lucide-react'
import type { ReconciliationResult, TableMapping } from '../../types'
import { cn } from '@/lib/utils'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import ConfidenceBadge from '../shared/ConfidenceBadge'
import { ConfidenceTooltip } from '../shared/ConfidenceTooltip'
import ColumnDetailsDrawer from './ColumnDetailsDrawer'

interface Props { result: ReconciliationResult }


// --- Mapping review state ---
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [selectedMapping, setSelectedMapping] = useState<TableMapping | null>(null)
  const [reviewed, setReviewed] = useState<Set<number>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  useKeyboardShortcuts({
    onSearchFocus: () => searchRef.current?.focus(),
    onEscape: () => setSearch(''),
  })

  const filtered = useMemo(() => {
    if (search.trim() === '') return result.table_mappings;
    const q = search.toLowerCase();
    return result.table_mappings.filter(m => {
      // Table name match
      if (m.table_a.name.toLowerCase().includes(q) || m.table_b.name.toLowerCase().includes(q)) return true;
      // Column name match (source or target)
      for (const col of m.column_mappings) {
        if (
          col.col_a.name.toLowerCase().includes(q) ||
          col.col_b.name.toLowerCase().includes(q)
        ) return true;
      }
      return false;
    });
  }, [result.table_mappings, search]);

  const toggle = (i: number) => {
    const s = new Set(expanded)
    s.has(i) ? s.delete(i) : s.add(i)
    setExpanded(s)
  }

  const { tables_matched, tables_in_a, average_confidence, total_conflicts } = result.summary

  return (
    <div className="space-y-6">
      <ColumnDetailsDrawer mapping={selectedMapping} onClose={() => setSelectedMapping(null)} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Tables matched" value={`${tables_matched} / ${tables_in_a}`} />
        <Stat label="Avg confidence" value={`${(average_confidence * 100).toFixed(0)}%`} accent />
        <Stat label="Conflicts" value={String(total_conflicts)} warn={total_conflicts > 0} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search tables…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 pl-10 pr-12 text-sm text-white/80 placeholder-white/25 transition-colors focus:border-white/[0.15] focus:bg-white/[0.06] focus:outline-none"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-white/15">
          Esc
        </span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mapping Review Checklist */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
        <h3 className="text-xs font-semibold text-white/40 mb-2">Mapping Review Checklist</h3>
        <ul className="space-y-2">
          {result.table_mappings.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reviewed.has(i)}
                onChange={() => {
                  const s = new Set(reviewed)
                  s.has(i) ? s.delete(i) : s.add(i)
                  setReviewed(s)
                }}
                className="accent-indigo-500 h-4 w-4 rounded border border-white/15 bg-white/5"
                id={`reviewed-${i}`}
              />
              <label htmlFor={`reviewed-${i}`} className="text-xs text-white/70 cursor-pointer">
                {m.table_a.name} → {m.table_b.name}
              </label>
              {reviewed.has(i) && <span className="ml-1 text-xs text-green-400">Reviewed</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Mappings */}
      {filtered.length === 0 ? (
        <Empty message={search ? 'No tables match your search' : 'No table mappings found'} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.07]">
          {filtered.map((m, i) => (
            <Row
              key={i}
              mapping={m}
              index={i}
              isExpanded={expanded.has(i)}
              onToggle={() => toggle(i)}
              isLast={i === filtered.length - 1}
              onViewDetails={() => setSelectedMapping(m)}
              reviewed={reviewed.has(i)}
              onToggleReviewed={() => {
                const s = new Set(reviewed)
                s.has(i) ? s.delete(i) : s.add(i)
                setReviewed(s)
              }}
            />
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

function Row({ mapping, index, isExpanded, onToggle, isLast, onViewDetails, reviewed, onToggleReviewed }: {
  mapping: TableMapping
  index: number
  isExpanded: boolean
  onToggle: () => void
  isLast: boolean
  onViewDetails: () => void
  reviewed?: boolean
  onToggleReviewed?: () => void
}) {

  return (
    <div className={cn(!isLast && 'border-b border-white/[0.05]', reviewed && 'bg-green-900/10')}> 
      <motion.button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
        initial={false}
      >
        {/* Review checkbox */}
        <input
          type="checkbox"
          checked={!!reviewed}
          onChange={e => {
            e.stopPropagation();
            onToggleReviewed && onToggleReviewed();
          }}
          className="accent-indigo-500 h-4 w-4 rounded border border-white/15 bg-white/5 mr-2"
          title="Mark as reviewed"
        />
        {/* Index */}
        <span className="w-5 shrink-0 text-xs text-white/20">{index + 1}</span>
        {reviewed && <span className="ml-1 text-xs text-green-400">Reviewed</span>}

        {/* Source → Target */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <TableName name={mapping.table_a.name} cols={mapping.table_a.columns.length} color="indigo" />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/20" />
          <TableName name={mapping.table_b.name} cols={mapping.table_b.columns.length} color="violet" />
        </div>

        {/* Confidence */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="group relative">
            <ConfidenceBadge value={mapping.confidence} />
            <div className="pointer-events-none absolute -right-2 -top-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
              <ConfidenceTooltip
                structuralScore={mapping.structural_score}
                semanticScore={mapping.semantic_score}
                combinedScore={mapping.confidence}
                matchReason={mapping.column_mappings[0]?.mapping_type}
              />
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-white/25 transition-transform', isExpanded && 'rotate-180')} />
        </div>

        {/* View details button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails()
          }}
          className="ml-2 text-white/30 hover:text-white/60 transition-colors p-1"
          title="View column details"
        >
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </motion.button>
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
              {/* Table statistics */}
              <div className="flex flex-wrap gap-4 mb-2">
                <div>
                  <span className="text-xs text-white/30">Source columns:</span>
                  <span className="ml-1 text-xs text-white/60 font-mono">{mapping.table_a.columns.length}</span>
                </div>
                <div>
                  <span className="text-xs text-white/30">Target columns:</span>
                  <span className="ml-1 text-xs text-white/60 font-mono">{mapping.table_b.columns.length}</span>
                </div>
                <div>
                  <span className="text-xs text-white/30">Source types:</span>
                  <span className="ml-1 text-xs text-white/60 font-mono">{Array.from(new Set(mapping.table_a.columns.map(c => c.data_type.base_type))).filter(Boolean).join(', ')}</span>
                </div>
                <div>
                  <span className="text-xs text-white/30">Target types:</span>
                  <span className="ml-1 text-xs text-white/60 font-mono">{Array.from(new Set(mapping.table_b.columns.map(c => c.data_type.base_type))).filter(Boolean).join(', ')}</span>
                </div>
              </div>
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
