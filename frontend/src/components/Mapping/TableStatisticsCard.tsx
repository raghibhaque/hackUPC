import { motion } from 'framer-motion'
import { Database, Columns, AlertCircle, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MappingStats, getDataTypeCategory, getTypeColor } from '../../hooks/useTableStatistics'
import type { TableMapping } from '../../types'
import DetailedStatisticsModal from './DetailedStatisticsModal'

interface Props {
  stats: MappingStats
  isExpanded?: boolean
  mapping?: TableMapping
}

export default function TableStatisticsCard({ stats, isExpanded = false, mapping }: Props) {
  const [showDetails, setShowDetails] = useState(false)
  const dataTypeEntries = [
    ...Object.entries(stats.sourceTable.dataTypes).slice(0, 3),
  ]

  const targetDataTypeEntries = [
    ...Object.entries(stats.targetTable.dataTypes).slice(0, 3),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-4"
    >
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Source Table */}
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-white/80">Source</h4>
          </div>

          <div className="space-y-1.5 pl-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Columns:</span>
              <span className="font-semibold text-white/90">{stats.sourceTable.columnCount}</span>
            </div>

            {stats.sourceTable.primaryKey && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Primary Key:</span>
                <span className="font-mono text-emerald-300">{stats.sourceTable.primaryKey}</span>
              </div>
            )}

            {stats.sourceTable.indexes > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Indexes:</span>
                <span className="font-semibold text-cyan-300">{stats.sourceTable.indexes}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Target Table */}
        <motion.div
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-400" />
            <h4 className="text-xs font-semibold text-white/80">Target</h4>
          </div>

          <div className="space-y-1.5 pl-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Columns:</span>
              <span className="font-semibold text-white/90">{stats.targetTable.columnCount}</span>
            </div>

            {stats.targetTable.primaryKey && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Primary Key:</span>
                <span className="font-mono text-emerald-300">{stats.targetTable.primaryKey}</span>
              </div>
            )}

            {stats.targetTable.indexes > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Indexes:</span>
                <span className="font-semibold text-cyan-300">{stats.targetTable.indexes}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Data Types Distribution */}
      {(Object.keys(stats.sourceTable.dataTypes).length > 0 || Object.keys(stats.targetTable.dataTypes).length > 0) && (
        <div className="border-t border-white/[0.05] pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Columns className="h-4 w-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-white/70">Data Types</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Source Types */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/50 font-semibold">Source</p>
              <div className="flex flex-wrap gap-1">
                {dataTypeEntries.map(([type, count], i) => (
                  <motion.span
                    key={`source-${type}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'text-[10px] font-semibold px-2 py-1 rounded border',
                      getTypeColor(type)
                    )}
                  >
                    {getDataTypeCategory(type)} ({count})
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Target Types */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/50 font-semibold">Target</p>
              <div className="flex flex-wrap gap-1">
                {targetDataTypeEntries.map(([type, count], i) => (
                  <motion.span
                    key={`target-${type}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'text-[10px] font-semibold px-2 py-1 rounded border',
                      getTypeColor(type)
                    )}
                  >
                    {getDataTypeCategory(type)} ({count})
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Quality */}
      <div className="border-t border-white/[0.05] pt-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[10px] text-white/50 mb-1">Mapped</p>
            <p className="font-bold text-emerald-300">{stats.matchedColumns}</p>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-white/50 mb-1">Unmapped</p>
            <p className={`font-bold ${stats.unmappedSourceColumns > 0 ? 'text-amber-300' : 'text-white/40'}`}>
              {stats.unmappedSourceColumns}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-white/50 mb-1">Conflicts</p>
            <p className={`font-bold flex items-center justify-center gap-1 ${stats.typeConflicts > 0 ? 'text-rose-300' : 'text-white/40'}`}>
              {stats.typeConflicts > 0 && <AlertCircle className="h-3 w-3" />}
              {stats.typeConflicts}
            </p>
          </div>
        </div>
      </div>

      {/* Details Button */}
      {mapping && (
        <motion.button
          type="button"
          onClick={() => setShowDetails(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2 px-3 rounded-lg border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] text-xs font-medium text-white/70 hover:text-white/90 transition-all flex items-center justify-center gap-2 group"
        >
          <span>View Detailed Statistics</span>
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      )}

      {/* Detailed Statistics Modal */}
      {mapping && (
        <DetailedStatisticsModal mapping={mapping} isOpen={showDetails} onClose={() => setShowDetails(false)} />
      )}
    </motion.div>
  )
}
