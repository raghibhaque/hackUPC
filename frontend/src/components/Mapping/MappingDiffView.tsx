import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle } from 'lucide-react'
import type { TableMapping } from '../../types'
import { useTheme } from '../../hooks/useTheme'
import ConfidenceBadge from '../shared/ConfidenceBadge'
import { cn } from '@/lib/utils'

interface Props {
  mapping: TableMapping | null
  onClose: () => void
}

export default function MappingDiffView({ mapping, onClose }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!mapping) return null

  const sourceColumns = mapping.table_a.columns || []
  const targetColumns = mapping.table_b.columns || []
  const columnMappings = mapping.column_mappings || []

  // Create a map of target column names for quick lookup
  const mappedTargetCols = new Set(columnMappings.map(cm => cm.col_b.name))
  const mappedSourceCols = new Set(columnMappings.map(cm => cm.col_a.name))

  // Get unmapped columns
  const unmappedSourceCols = sourceColumns.filter(col => !mappedSourceCols.has(col.name))
  const unmappedTargetCols = targetColumns.filter(col => !mappedTargetCols.has(col.name))

  return (
    <AnimatePresence>
      {mapping && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 z-40 backdrop-blur-sm ${
              isDark ? 'bg-black/50' : 'bg-black/30'
            }`}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-5xl rounded-xl border backdrop-blur-sm shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${
                isDark
                  ? 'border-white/[0.12] bg-[#0a0a12]/95'
                  : 'border-slate-300 bg-white/95'
              }`}
            >
              {/* Header */}
              <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between ${
                isDark
                  ? 'border-white/[0.07] bg-[#06060e]/80'
                  : 'border-slate-200 bg-slate-50/80'
              }`}>
                <div>
                  <h2 className={`text-lg font-semibold ${
                    isDark ? 'text-white/80' : 'text-slate-900'
                  }`}>Schema Comparison</h2>
                  <p className={`mt-1 text-xs ${
                    isDark ? 'text-white/40' : 'text-slate-600'
                  }`}>
                    {mapping.table_a.name} → {mapping.table_b.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ConfidenceBadge value={mapping.confidence} size="sm" showPercent={true} />
                  <button
                    onClick={onClose}
                    className="text-white/40 hover:text-white/60 transition-colors p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* Summary stats */}
                <div className="grid grid-cols-4 gap-3">
                  <StatBox label="Columns Mapped" value={columnMappings.length} color="emerald" />
                  <StatBox label="Source Unmapped" value={unmappedSourceCols.length} color="amber" />
                  <StatBox label="Target Unmapped" value={unmappedTargetCols.length} color="amber" />
                  <StatBox label="Match Rate" value={`${((columnMappings.length / Math.max(sourceColumns.length, targetColumns.length)) * 100).toFixed(0)}%`} color="indigo" />
                </div>

                {/* Diff view */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Source */}
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      Source: {mapping.table_a.name}
                    </h3>
                    <div className="space-y-2">
                      {sourceColumns.map((col, i) => {
                        const mapping_info = columnMappings.find(cm => cm.col_a.name === col.name)
                        const isMapped = mappedSourceCols.has(col.name)

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className={cn(
                              'rounded-lg border px-3 py-2 text-xs transition-colors',
                              isMapped
                                ? 'border-emerald-500/20 bg-emerald-500/10'
                                : 'border-amber-500/20 bg-amber-500/10'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono font-medium text-indigo-200">
                                  {col.name}
                                </p>
                                <p className="text-white/50 mt-0.5">
                                  {col.data_type?.base_type || 'unknown'}
                                </p>
                              </div>
                              {isMapped && (
                                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                              )}
                            </div>
                            {mapping_info && (
                              <div className="mt-2 flex items-center justify-between pt-2 border-t border-white/[0.05]">
                                <span className="text-[10px] text-white/40">→ {mapping_info.col_b.name}</span>
                                <ConfidenceBadge
                                  value={mapping_info.confidence}
                                  size="sm"
                                  showPercent={true}
                                />
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Target */}
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-violet-400" />
                      Target: {mapping.table_b.name}
                    </h3>
                    <div className="space-y-2">
                      {targetColumns.map((col, i) => {
                        const mapping_info = columnMappings.find(cm => cm.col_b.name === col.name)
                        const isMapped = mappedTargetCols.has(col.name)

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className={cn(
                              'rounded-lg border px-3 py-2 text-xs transition-colors',
                              isMapped
                                ? 'border-emerald-500/20 bg-emerald-500/10'
                                : 'border-amber-500/20 bg-amber-500/10'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono font-medium text-violet-200">
                                  {col.name}
                                </p>
                                <p className="text-white/50 mt-0.5">
                                  {col.data_type?.base_type || 'unknown'}
                                </p>
                              </div>
                              {isMapped && (
                                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                              )}
                            </div>
                            {mapping_info && (
                              <div className="mt-2 flex items-center justify-between pt-2 border-t border-white/[0.05]">
                                <span className="text-[10px] text-white/40">{mapping_info.col_a.name} ←</span>
                                <ConfidenceBadge
                                  value={mapping_info.confidence}
                                  size="sm"
                                  showPercent={true}
                                />
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Type mismatches */}
                {columnMappings.some(cm => cm.col_a.data_type?.base_type !== cm.col_b.data_type?.base_type) && (
                  <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
                    <h4 className="text-sm font-semibold text-orange-300 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Type Mismatches
                    </h4>
                    <div className="space-y-2">
                      {columnMappings
                        .filter(cm => cm.col_a.data_type?.base_type !== cm.col_b.data_type?.base_type)
                        .map((cm, i) => (
                          <div key={i} className="text-xs text-orange-200/80 flex items-center justify-between">
                            <span className="font-mono">{cm.col_a.name}</span>
                            <span className="text-white/40">
                              {cm.col_a.data_type?.base_type} → {cm.col_b.data_type?.base_type}
                            </span>
                            <span className="text-white/30">({cm.col_b.name})</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: 'emerald' | 'amber' | 'indigo'
}) {
  const colors = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300',
  }

  return (
    <div className={cn('rounded-lg border px-3 py-2 text-center', colors[color])}>
      <p className="text-[10px] uppercase tracking-wider text-white/60 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}
