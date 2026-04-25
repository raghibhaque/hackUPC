import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ArrowRight, AlertTriangle, Search, X } from 'lucide-react'
import type { ReconciliationResult, TableMapping } from '../../types'
import { cn } from '@/lib/utils'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import ConfidenceBadge from '../shared/ConfidenceBadge'
import { ConfidenceTooltip } from '../shared/ConfidenceTooltip'
import ColumnDetailsDrawer from './ColumnDetailsDrawer'
import ConfidenceFilterSlider from './ConfidenceFilterSlider'
import BulkActionBar from './BulkActionBar'
import MappingDiffView from './MappingDiffView'

interface Props {
  result: ReconciliationResult
}

export default function MappingTable({ result }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [selectedMapping, setSelectedMapping] = useState<TableMapping | null>(null)
  const [diffMapping, setDiffMapping] = useState<TableMapping | null>(null)
  const [reviewed, setReviewed] = useState<Set<number>>(new Set())
  const [minConfidence, setMinConfidence] = useState(0)
  const [selectedForBulk, setSelectedForBulk] = useState<Set<number>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  // Generate a unique session key for this reconciliation result
  const sessionKey = useMemo(() => {
    const { tables_in_a, tables_in_b, tables_matched, average_confidence } = result.summary
    return `schemahub:reviews:${tables_in_a}_${tables_in_b}_${tables_matched}_${average_confidence.toFixed(2)}`
  }, [result.summary])

  // Load reviewed state from localStorage on mount and when sessionKey changes
  useEffect(() => {
    const stored = localStorage.getItem(sessionKey)
    if (stored) {
      try {
        const indices = JSON.parse(stored)
        setReviewed(new Set(indices))
      } catch (e) {
        console.warn('Failed to parse stored reviews:', e)
      }
    }
  }, [sessionKey])

  // Save reviewed state to localStorage whenever it changes
  useEffect(() => {
    const indices = Array.from(reviewed)
    localStorage.setItem(sessionKey, JSON.stringify(indices))
  }, [reviewed, sessionKey])

  useKeyboardShortcuts({
    onSearchFocus: () => searchRef.current?.focus(),
    onEscape: () => setSearch(''),
  })

  const filtered = useMemo(() => {
    let mappings = result.table_mappings ?? []

    // Search filter
    if (search.trim() !== '') {
      const q = search.toLowerCase()
      mappings = mappings.filter((m) => {
        if (
          m.table_a.name.toLowerCase().includes(q) ||
          m.table_b.name.toLowerCase().includes(q)
        ) {
          return true
        }

        for (const col of m.column_mappings ?? []) {
          if (
            col.col_a.name.toLowerCase().includes(q) ||
            col.col_b.name.toLowerCase().includes(q)
          ) {
            return true
          }
        }

        return false
      })
    }

    // Confidence filter
    if (minConfidence > 0) {
      mappings = mappings.filter(m => m.confidence >= minConfidence)
    }

    return mappings
  }, [result.table_mappings, search])

  const toggle = (i: number) => {
    const s = new Set(expanded)
    s.has(i) ? s.delete(i) : s.add(i)
    setExpanded(s)
  }

  const toggleReviewed = (i: number) => {
    const s = new Set(reviewed)
    s.has(i) ? s.delete(i) : s.add(i)
    setReviewed(s)
  }

  const {
    tables_matched,
    tables_in_a,
    average_confidence,
    total_conflicts,
  } = result.summary

  const handleBulkMarkReviewed = () => {
    const newReviewed = new Set(reviewed)
    selectedForBulk.forEach(i => newReviewed.add(i))
    setReviewed(newReviewed)
  }

  const handleExportSelected = () => {
    const selectedMappings = filtered.filter((_, i) => selectedForBulk.has(i))
    const data = {
      selected_mappings: selectedMappings.map(m => ({
        source: m.table_a.name,
        target: m.table_b.name,
        confidence: m.confidence,
      })),
      count: selectedMappings.length,
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected-mappings-${Date.now()}.json`
    a.click()
  }

  return (
    <div className="space-y-6">
      <BulkActionBar
        selectedCount={selectedForBulk.size}
        totalCount={filtered.length}
        onMarkReviewed={handleBulkMarkReviewed}
        onExportSelected={handleExportSelected}
        onClearSelection={() => setSelectedForBulk(new Set())}
      />

      <MappingDiffView
        mapping={diffMapping}
        onClose={() => setDiffMapping(null)}
      />

      <ColumnDetailsDrawer
        mapping={selectedMapping}
        onClose={() => setSelectedMapping(null)}
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Tables matched" value={`${tables_matched} / ${tables_in_a}`} />
        <Stat
          label="Avg confidence"
          value={`${(average_confidence * 100).toFixed(0)}%`}
          accent
        />
        <Stat
          label="Conflicts"
          value={String(total_conflicts)}
          warn={total_conflicts > 0}
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search tables…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 pl-10 pr-12 text-sm text-white/80 placeholder-white/25 transition-colors focus:border-white/[0.15] focus:bg-white/[0.06] focus:outline-none"
        />

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-white/15">
          Esc
        </span>

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-white/20 transition-colors hover:text-white/40"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ConfidenceFilterSlider
        minConfidence={minConfidence}
        onChange={setMinConfidence}
        mappingsCount={result.table_mappings?.length ?? 0}
        filteredCount={filtered.length}
      />

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
        <h3 className="mb-2 text-xs font-semibold text-white/40">
          Mapping Review Checklist
        </h3>

        <ul className="space-y-2">
          {(result.table_mappings ?? []).map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reviewed.has(i)}
                onChange={() => toggleReviewed(i)}
                className="h-4 w-4 rounded border border-white/15 bg-white/5 accent-indigo-500"
                id={`reviewed-${i}`}
              />

              <label
                htmlFor={`reviewed-${i}`}
                className="cursor-pointer text-xs text-white/70"
              >
                {m.table_a.name} → {m.table_b.name}
              </label>

              {reviewed.has(i) && (
                <span className="ml-1 text-xs text-green-400">Reviewed</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {filtered.length === 0 ? (
        <Empty message={search ? 'No tables match your search' : 'No table mappings found'} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.07]">
          {filtered.map((m, i) => (
            <Row
              key={`${m.table_a.name}-${m.table_b.name}-${i}`}
              mapping={m}
              index={i}
              isExpanded={expanded.has(i)}
              onToggle={() => toggle(i)}
              isLast={i === filtered.length - 1}
              onViewDetails={() => setSelectedMapping(m)}
              onViewDiff={() => setDiffMapping(m)}
              reviewed={reviewed.has(i)}
              onToggleReviewed={() => toggleReviewed(i)}
              searchTerm={search}
              isBulkSelected={selectedForBulk.has(i)}
              onBulkToggle={() => {
                const newSet = new Set(selectedForBulk)
                if (newSet.has(i)) newSet.delete(i)
                else newSet.add(i)
                setSelectedForBulk(newSet)
              }}
            />
          ))}
        </div>
      )}

      {(result.unmatched_tables_a ?? []).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" />

            <div>
              <p className="text-sm font-medium text-amber-300/80">
                {result.unmatched_tables_a.length} unmatched table
                {result.unmatched_tables_a.length !== 1 ? 's' : ''} — manual mapping needed
              </p>

              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {result.unmatched_tables_a.map((t) => (
                  <code
                    key={t}
                    className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300/70"
                  >
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

function Row({
  mapping,
  index,
  isExpanded,
  onToggle,
  isLast,
  onViewDetails,
  onViewDiff,
  reviewed = false,
  onToggleReviewed,
  searchTerm = '',
  isBulkSelected = false,
  onBulkToggle,
}: {
  mapping: TableMapping
  index: number
  isExpanded: boolean
  onToggle: () => void
  isLast: boolean
  onViewDetails: () => void
  onViewDiff: () => void
  reviewed?: boolean
  onToggleReviewed?: () => void
  searchTerm?: string
  isBulkSelected?: boolean
  onBulkToggle?: () => void
}) {
  const sourceTypes = Array.from(
    new Set(
      mapping.table_a.columns
        .map((c) => c.data_type?.base_type)
        .filter(Boolean)
    )
  ).join(', ')

  const targetTypes = Array.from(
    new Set(
      mapping.table_b.columns
        .map((c) => c.data_type?.base_type)
        .filter(Boolean)
    )
  ).join(', ')

  return (
    <div className={cn(
      !isLast && 'border-b border-white/[0.05]',
      reviewed && 'bg-gradient-to-r from-green-900/[0.15] to-transparent'
    )}>
      <motion.button
        type="button"
        onClick={onToggle}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-all"
        initial={false}
      >
        <motion.input
          type="checkbox"
          checked={reviewed}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleReviewed?.()}
          className="mr-2 h-4 w-4 rounded border border-white/15 bg-white/5 accent-indigo-500 transition-all"
          title="Mark as reviewed"
          whileHover={{ scale: 1.1 }}
        />

        <motion.input
          type="checkbox"
          checked={isBulkSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={onBulkToggle}
          className="h-4 w-4 rounded border border-white/15 bg-white/5 accent-indigo-500 transition-all"
          title="Select for bulk actions"
          whileHover={{ scale: 1.1 }}
        />

        <span className="w-5 shrink-0 text-xs font-semibold text-white/30">{index + 1}</span>

        {reviewed && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-1 text-xs font-semibold text-green-400"
          >
            ✓ Reviewed
          </motion.span>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TableName
            name={mapping.table_a.name}
            cols={mapping.table_a.columns.length}
            color="indigo"
            highlight={searchTerm}
          />

          <motion.div
            className="h-3.5 w-3.5 shrink-0 text-white/20"
            whileHover={{ x: 2 }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.div>

          <TableName
            name={mapping.table_b.name}
            cols={mapping.table_b.columns.length}
            color="violet"
            highlight={searchTerm}
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <motion.div
            className="group relative"
            whileHover={{ scale: 1.08 }}
          >
            <ConfidenceBadge value={mapping.confidence} />

            <div className="pointer-events-none absolute -right-2 -top-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
              <ConfidenceTooltip
                structuralScore={mapping.structural_score}
                semanticScore={mapping.semantic_score}
                combinedScore={mapping.confidence}
                matchReason={mapping.column_mappings?.[0]?.mapping_type}
              />
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="h-4 w-4 text-white/25 transition-transform"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </div>

        <motion.button
          whileHover={{ scale: 1.15, x: 2 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails()
          }}
          className="ml-1 p-1 text-white/40 opacity-0 transition-all group-hover:opacity-100"
          title="View column details"
        >
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.15, x: 2 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            onViewDiff()
          }}
          className="ml-1 p-1 text-white/40 opacity-0 transition-all group-hover:opacity-100"
          title="Compare source vs target"
        >
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] bg-gradient-to-b from-white/[0.03] to-white/[0.01] px-5 pb-4 pt-3">
              <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                <div>
                  <p className="text-xs font-semibold text-white/40 mb-1">Source Stats</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-white/30">Columns:</span>
                      <span className="font-mono text-xs text-white/70 font-semibold">
                        {mapping.table_a.columns.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-white/30">Types:</span>
                      <span className="font-mono text-xs text-white/60 truncate text-right">
                        {sourceTypes || 'unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-white/40 mb-1">Target Stats</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-white/30">Columns:</span>
                      <span className="font-mono text-xs text-white/70 font-semibold">
                        {mapping.table_b.columns.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-white/30">Types:</span>
                      <span className="font-mono text-xs text-white/60 truncate text-right">
                        {targetTypes || 'unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/25">
                Column mappings · {(mapping.column_mappings ?? []).length}
              </p>

              <div className="space-y-2">
                {(mapping.column_mappings ?? []).map((col, ci) => (
                  <motion.div
                    key={ci}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ci * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-gradient-to-r from-white/[0.02] to-transparent px-3 py-2.5 text-xs transition-all"
                  >
                    <code className="font-semibold text-indigo-300/90">{col.col_a.name}</code>
                    <span className="text-white/[0.2]">·</span>
                    <code className="font-mono text-white/40 text-[11px]">
                      {col.col_a.data_type?.base_type ?? 'unknown'}
                    </code>

                    <motion.div className="h-3 w-3 shrink-0 text-white/15" whileHover={{ x: 2 }}>
                      <ArrowRight className="h-3 w-3" />
                    </motion.div>

                    <code className="font-semibold text-violet-300/90">{col.col_b.name}</code>
                    <span className="text-white/[0.2]">·</span>
                    <code className="font-mono text-white/40 text-[11px]">
                      {col.col_b.data_type?.base_type ?? 'unknown'}
                    </code>

                    <span className="ml-auto text-white/40 font-semibold">
                      {(col.confidence * 100).toFixed(0)}%
                    </span>

                    {(col.conflicts?.length ?? 0) > 0 && (
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        title={`${col.conflicts.length} conflict(s)`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400/70" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TableName({
  name,
  cols,
  color,
  highlight = '',
}: {
  name: string
  cols: number
  color: 'indigo' | 'violet'
  highlight?: string
}) {
  const renderHighlight = () => {
    if (!highlight.trim()) return name

    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = name.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <motion.span
          key={i}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-yellow-400/40 to-yellow-300/30 font-semibold text-yellow-200 rounded px-1"
        >
          {part}
        </motion.span>
      ) : (
        part
      )
    )
  }

  return (
    <motion.div
      className="min-w-0 flex-1"
      whileHover={{ x: 2 }}
    >
      <p
        className={cn(
          'truncate text-sm font-semibold',
          color === 'indigo' ? 'text-indigo-200/95' : 'text-violet-200/95'
        )}
      >
        {renderHighlight()}
      </p>

      <p className="text-xs font-medium text-white/35">{cols} columns</p>
    </motion.div>
  )
}

function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string
  value: string
  accent?: boolean
  warn?: boolean
}) {
  const baseClass = accent
    ? 'border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5'
    : warn
      ? 'border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5'
      : 'border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02]'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'rounded-xl border px-4 py-3.5 transition-all',
        baseClass
      )}
    >
      <p className="text-xs font-medium text-white/40 uppercase tracking-wide">{label}</p>

      <p
        className={cn(
          'mt-2 text-2xl font-bold tabular-nums',
          warn
            ? 'text-amber-300'
            : accent
              ? 'text-indigo-300'
              : 'text-white/90'
        )}
      >
        {value}
      </p>
    </motion.div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02] px-6 py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="mx-auto mb-4 h-12 w-12 rounded-full border border-white/[0.1] flex items-center justify-center"
      >
        <span className="text-xl">🔍</span>
      </motion.div>
      <p className="text-sm font-medium text-white/50">{message}</p>
      {message === 'No tables match your search' && (
        <p className="mt-2 text-xs text-white/30">Try adjusting your search terms or filters</p>
      )}
    </motion.div>
  )
}