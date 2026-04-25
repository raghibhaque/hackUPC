import { motion } from 'framer-motion'
import { X, Database, Key, Index, Zap } from 'lucide-react'
import { useState } from 'react'
import type { TableMapping, ColumnMapping } from '../../types'
import { cn } from '@/lib/utils'

interface Props {
  mapping: TableMapping
  isOpen: boolean
  onClose: () => void
}

export default function DetailedStatisticsModal({ mapping, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'constraints'>('overview')

  if (!isOpen) return null

  const sourceColumns = mapping.table_a.columns
  const targetColumns = mapping.table_b.columns
  const columnMappings = mapping.column_mappings || []

  // Analyze data types
  const sourceTypeDistribution: Record<string, number> = {}
  sourceColumns.forEach(col => {
    const type = (col.data_type?.base_type || 'Unknown').toLowerCase()
    sourceTypeDistribution[type] = (sourceTypeDistribution[type] || 0) + 1
  })

  const targetTypeDistribution: Record<string, number> = {}
  targetColumns.forEach(col => {
    const type = (col.data_type?.base_type || 'Unknown').toLowerCase()
    targetTypeDistribution[type] = (targetTypeDistribution[type] || 0) + 1
  })

  // Count conflicts
  const typeConflicts = columnMappings.filter((cm: ColumnMapping) => {
    const sourceType = (cm.col_a?.data_type?.base_type || '').toLowerCase()
    const targetType = (cm.col_b?.data_type?.base_type || '').toLowerCase()
    return sourceType !== targetType && sourceType !== '' && targetType !== ''
  }).length

  const unmappedSource = sourceColumns.length - columnMappings.length
  const unmappedTarget = targetColumns.length - columnMappings.length

  // Get constraints info
  const sourcePK = mapping.table_a.primary_key
  const targetPK = mapping.table_b.primary_key
  const sourceIndexes = mapping.table_a.indexes || []
  const targetIndexes = mapping.table_b.indexes || []

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/[0.1] shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-white/[0.05] bg-white/[0.02] backdrop-blur px-5 sm:px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mapping.table_a.name} → {mapping.table_b.name}
            </h2>
            <p className="text-xs text-white/50 mt-1">Detailed Schema Statistics</p>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
          >
            <X className="h-5 w-5 text-white/60 hover:text-white/80" />
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/[0.05] bg-white/[0.02] px-5 sm:px-6 py-3">
          {(['overview', 'columns', 'constraints'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-2 text-xs font-medium rounded-lg transition-all capitalize',
                activeTab === tab
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/[0.05]'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6">
          {activeTab === 'overview' && (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Source Cols', value: sourceColumns.length, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                  { label: 'Target Cols', value: targetColumns.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { label: 'Mapped', value: columnMappings.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
                  { label: 'Conflicts', value: typeConflicts, color: typeConflicts > 0 ? 'text-rose-400' : 'text-white/40', bg: typeConflicts > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/[0.02] border-white/[0.1]' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    variants={item}
                    className={cn('rounded-lg border p-3 space-y-1', stat.bg)}
                  >
                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">{stat.label}</p>
                    <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Type distribution */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Type Distribution</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Source */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/50 font-medium">Source Table</p>
                    <div className="space-y-1 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                      {Object.entries(sourceTypeDistribution).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <span className="text-white/60 capitalize">{type}</span>
                          <span className="font-semibold text-white/80 bg-white/[0.05] px-2 py-0.5 rounded">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Target */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/50 font-medium">Target Table</p>
                    <div className="space-y-1 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                      {Object.entries(targetTypeDistribution).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <span className="text-white/60 capitalize">{type}</span>
                          <span className="font-semibold text-white/80 bg-white/[0.05] px-2 py-0.5 rounded">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mapping summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Mapping Summary</h3>
                <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-400">{columnMappings.length}</p>
                    <p className="text-xs text-white/50 mt-1">Mapped</p>
                  </div>
                  <div className="text-center border-l border-r border-white/[0.1]">
                    <p className="text-2xl font-bold text-amber-400">{Math.max(unmappedSource, unmappedTarget)}</p>
                    <p className="text-xs text-white/50 mt-1">Unmapped</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-rose-400">{typeConflicts}</p>
                    <p className="text-xs text-white/50 mt-1">Type Issues</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'columns' && (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Mapped Columns</h3>
                <div className="space-y-1 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 max-h-64 overflow-y-auto">
                  {columnMappings.map((cm: ColumnMapping, i) => {
                    const hasConflict = cm.col_a?.data_type?.base_type?.toLowerCase() !== cm.col_b?.data_type?.base_type?.toLowerCase()
                    return (
                      <motion.div
                        key={i}
                        variants={item}
                        className={cn(
                          'flex items-center justify-between text-xs p-2 rounded border',
                          hasConflict
                            ? 'bg-rose-500/10 border-rose-500/20'
                            : 'border-transparent hover:bg-white/[0.05]'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 truncate">{cm.col_a?.name}</p>
                          <p className="text-white/40 text-[10px]">{cm.col_a?.data_type?.base_type}</p>
                        </div>
                        <div className="px-2 text-white/40">→</div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-white/80 truncate">{cm.col_b?.name}</p>
                          <p className="text-white/40 text-[10px]">{cm.col_b?.data_type?.base_type}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'constraints' && (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Primary Keys */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Primary Keys</h3>
                  </div>
                  <div className="space-y-2 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                    <div>
                      <p className="text-[10px] text-white/50 font-medium mb-1">Source</p>
                      <p className="text-xs text-white/80">{sourcePK || 'None'}</p>
                    </div>
                    <div className="border-t border-white/[0.05] pt-2">
                      <p className="text-[10px] text-white/50 font-medium mb-1">Target</p>
                      <p className="text-xs text-white/80">{targetPK || 'None'}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Indexes */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Index className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Indexes</h3>
                  </div>
                  <div className="space-y-2 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                    <div>
                      <p className="text-[10px] text-white/50 font-medium mb-1">Source</p>
                      <p className="text-xs text-white/80">{sourceIndexes.length} index(es)</p>
                    </div>
                    <div className="border-t border-white/[0.05] pt-2">
                      <p className="text-[10px] text-white/50 font-medium mb-1">Target</p>
                      <p className="text-xs text-white/80">{targetIndexes.length} index(es)</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
