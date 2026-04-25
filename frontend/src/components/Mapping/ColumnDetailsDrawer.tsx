import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, AlertTriangle } from 'lucide-react'
import type { TableMapping } from '../../types'
import { cn } from '@/lib/utils'
import { useTheme } from '../../hooks/useTheme'
import ConfidenceBadge from '../shared/ConfidenceBadge'

interface Props {
  mapping: TableMapping | null
  onClose: () => void
}

export default function ColumnDetailsDrawer({ mapping, onClose }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!mapping) return null

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
              isDark ? 'bg-black/40' : 'bg-black/20'
            }`}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto border-l ${
              isDark
                ? 'bg-[#0a0a12] border-white/[0.07]'
                : 'bg-white border-slate-200'
            }`}
          >
            {/* Header */}
            <div className={`sticky top-0 border-b backdrop-blur-sm px-6 py-4 flex items-center justify-between ${
              isDark
                ? 'border-white/[0.07] bg-[#06060e]/80'
                : 'border-slate-200 bg-slate-50/80'
            }`}>
              <div>
                <h2 className={`text-lg font-semibold ${
                  isDark ? 'text-white/80' : 'text-slate-900'
                }`}>Column Mappings</h2>
                <p className={`mt-1 text-xs ${
                  isDark ? 'text-white/40' : 'text-slate-600'
                }`}>
                  {mapping.table_a.name} → {mapping.table_b.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className={`transition-colors p-1 ${
                  isDark
                    ? 'text-white/40 hover:text-white/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              {mapping.column_mappings.length === 0 ? (
                <p className={`text-sm ${
                  isDark ? 'text-white/30' : 'text-slate-600'
                }`}>No column mappings found</p>
              ) : (
                mapping.column_mappings.map((col, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-lg border p-4 transition-colors ${
                      isDark
                        ? 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]'
                        : 'border-slate-300 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {/* Column names */}
                    <div className="space-y-2 mb-3">
                      <div>
                        <p className={`text-xs mb-1 ${
                          isDark ? 'text-white/40' : 'text-slate-600'
                        }`}>Source</p>
                        <div className="flex items-center gap-2">
                          <code className={`text-sm font-medium ${
                            isDark ? 'text-indigo-300' : 'text-indigo-600'
                          }`}>
                            {col.col_a.name}
                          </code>
                          <span className={`text-xs rounded px-1.5 py-0.5 ${
                            isDark
                              ? 'text-white/25 bg-white/[0.05]'
                              : 'text-slate-700 bg-slate-300'
                          }`}>
                            {col.col_a.data_type.base_type}
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center justify-center ${
                        isDark ? 'text-white/20' : 'text-slate-400'
                      }`}>
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      </div>

                      <div>
                        <p className={`text-xs mb-1 ${
                          isDark ? 'text-white/40' : 'text-slate-600'
                        }`}>Target</p>
                        <div className="flex items-center gap-2">
                          <code className={`text-sm font-medium ${
                            isDark ? 'text-violet-300' : 'text-violet-600'
                          }`}>
                            {col.col_b.name}
                          </code>
                          <span className={`text-xs rounded px-1.5 py-0.5 ${
                            isDark
                              ? 'text-white/25 bg-white/[0.05]'
                              : 'text-slate-700 bg-slate-300'
                          }`}>
                            {col.col_b.data_type.base_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className={`flex items-center justify-between pt-3 border-t ${
                      isDark ? 'border-white/[0.05]' : 'border-slate-300'
                    }`}>
                      <span className={`text-xs ${
                        isDark ? 'text-white/40' : 'text-slate-600'
                      }`}>Confidence</span>
                      <ConfidenceBadge value={col.confidence} size="sm" showPercent={true} />
                    </div>

                    {/* Conflicts */}
                    {col.conflicts.length > 0 && (
                      <div className={`mt-3 pt-3 border-t ${
                        isDark ? 'border-white/[0.05]' : 'border-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className={`h-3.5 w-3.5 ${
                            isDark ? 'text-amber-400' : 'text-amber-600'
                          }`} />
                          <span className={`text-xs font-medium ${
                            isDark ? 'text-white/60' : 'text-slate-700'
                          }`}>
                            {col.conflicts.length} conflict{col.conflicts.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {col.conflicts.map((conflict: any, ci) => (
                            <div
                              key={ci}
                              className={cn(
                                'text-xs p-2 rounded border',
                                isDark
                                  ? conflict.severity === 'error'
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300/80'
                                    : conflict.severity === 'warning'
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300/80'
                                      : 'bg-blue-500/10 border-blue-500/20 text-blue-300/80'
                                  : conflict.severity === 'error'
                                    ? 'bg-rose-100 border-rose-300 text-rose-700'
                                    : conflict.severity === 'warning'
                                      ? 'bg-amber-100 border-amber-300 text-amber-700'
                                      : 'bg-blue-100 border-blue-300 text-blue-700'
                              )}
                            >
                              <p className="font-medium">{conflict.message}</p>
                              {conflict.details && (
                                <p className="mt-1 text-[11px] opacity-75">{conflict.details}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
