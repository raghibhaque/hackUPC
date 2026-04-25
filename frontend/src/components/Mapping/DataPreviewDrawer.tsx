import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, Database } from 'lucide-react'
import type { ColumnMapping } from '../../types'
import { useTheme } from '../../hooks/useTheme'
import { displayValue } from '../../lib/dataMasking'

interface Props {
  mapping: ColumnMapping | null
  sourceTableName: string
  targetTableName: string
  onClose: () => void
}

export default function DataPreviewDrawer({ mapping, sourceTableName, targetTableName, onClose }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!mapping) return null

  const hasSampleData = mapping.sample_values_a && mapping.sample_values_a.length > 0

  return (
    <AnimatePresence>
      {mapping && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 z-40 backdrop-blur-sm ${
              isDark ? 'bg-black/40' : 'bg-black/20'
            }`}
          />

          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl overflow-y-auto border-l ${
              isDark
                ? 'bg-[#0a0a12] border-white/[0.07]'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className={`sticky top-0 border-b backdrop-blur-sm px-6 py-4 flex items-center justify-between ${
              isDark
                ? 'border-white/[0.07] bg-[#06060e]/80'
                : 'border-slate-200 bg-slate-50/80'
            }`}>
              <div className="flex items-center gap-2">
                <Eye className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <div>
                  <h2 className={`text-lg font-semibold ${
                    isDark ? 'text-white/80' : 'text-slate-900'
                  }`}>Data Preview</h2>
                  <p className={`mt-1 text-xs ${
                    isDark ? 'text-white/40' : 'text-slate-600'
                  }`}>
                    {mapping.col_a.name} → {mapping.col_b.name}
                  </p>
                </div>
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

            <div className="p-6 space-y-6">
              {!hasSampleData ? (
                <div className={`rounded-lg border-2 border-dashed p-8 text-center ${
                  isDark
                    ? 'border-white/[0.05] bg-white/[0.02]'
                    : 'border-slate-300 bg-slate-50'
                }`}>
                  <Database className={`h-12 w-12 mx-auto mb-3 opacity-40 ${
                    isDark ? 'text-white' : 'text-slate-600'
                  }`} />
                  <h3 className={`font-medium mb-1 ${
                    isDark ? 'text-white/60' : 'text-slate-700'
                  }`}>
                    No sample data available
                  </h3>
                  <p className={`text-sm ${
                    isDark ? 'text-white/40' : 'text-slate-600'
                  }`}>
                    Sample data will be shown here when available from the database.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Source column */}
                  <div className={`rounded-lg border p-4 ${
                    isDark
                      ? 'border-white/[0.07] bg-white/[0.03]'
                      : 'border-slate-300 bg-slate-50'
                  }`}>
                    <div className="mb-4">
                      <p className={`text-xs font-semibold mb-1 ${
                        isDark ? 'text-white/40' : 'text-slate-600'
                      }`}>
                        SOURCE
                      </p>
                      <p className={`text-sm font-medium ${
                        isDark ? 'text-indigo-300' : 'text-indigo-600'
                      }`}>
                        {sourceTableName}.{mapping.col_a.name}
                      </p>
                      <p className={`text-xs mt-1 ${
                        isDark ? 'text-white/30' : 'text-slate-600'
                      }`}>
                        {mapping.col_a.data_type?.base_type || 'unknown'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {mapping.sample_values_a?.map((value, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-xs font-mono break-words ${
                            isDark
                              ? 'bg-white/[0.05] text-white/70'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {displayValue(value)}
                        </div>
                      ))}
                      {!mapping.sample_values_a?.length && (
                        <p className={`text-xs italic ${
                          isDark ? 'text-white/30' : 'text-slate-500'
                        }`}>
                          No sample values
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Target column */}
                  <div className={`rounded-lg border p-4 ${
                    isDark
                      ? 'border-white/[0.07] bg-white/[0.03]'
                      : 'border-slate-300 bg-slate-50'
                  }`}>
                    <div className="mb-4">
                      <p className={`text-xs font-semibold mb-1 ${
                        isDark ? 'text-white/40' : 'text-slate-600'
                      }`}>
                        TARGET
                      </p>
                      <p className={`text-sm font-medium ${
                        isDark ? 'text-violet-300' : 'text-violet-600'
                      }`}>
                        {targetTableName}.{mapping.col_b.name}
                      </p>
                      <p className={`text-xs mt-1 ${
                        isDark ? 'text-white/30' : 'text-slate-600'
                      }`}>
                        {mapping.col_b.data_type?.base_type || 'unknown'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {mapping.sample_values_b?.map((value, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-xs font-mono break-words ${
                            isDark
                              ? 'bg-white/[0.05] text-white/70'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {displayValue(value)}
                        </div>
                      ))}
                      {!mapping.sample_values_b?.length && (
                        <p className={`text-xs italic ${
                          isDark ? 'text-white/30' : 'text-slate-500'
                        }`}>
                          No sample values
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={`rounded-lg border p-4 ${
                isDark
                  ? 'border-amber-500/20 bg-amber-500/[0.06]'
                  : 'border-amber-300 bg-amber-100'
              }`}>
                <p className={`text-xs ${
                  isDark ? 'text-amber-200' : 'text-amber-900'
                }`}>
                  <span className="font-medium">Note:</span> Sensitive data like email addresses, phone numbers, and tokens are masked for privacy.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
