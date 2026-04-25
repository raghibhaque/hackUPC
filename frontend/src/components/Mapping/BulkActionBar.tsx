import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare2, Download, X } from 'lucide-react'
import { showToast } from '../../lib/toast'

interface Props {
  selectedCount: number
  totalCount: number
  onMarkReviewed: () => void
  onExportSelected: () => void
  onClearSelection: () => void
  isDark?: boolean
}

export default function BulkActionBar({
  selectedCount,
  totalCount,
  onMarkReviewed,
  onExportSelected,
  onClearSelection,
  isDark = true,
}: Props) {
  const handleSelectAll = () => {
    showToast(`Selected all ${totalCount} mappings`, 'info')
  }

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-xl p-4 backdrop-blur-sm shadow-lg border ${
            isDark
              ? 'bg-indigo-600/20 border-indigo-500/30'
              : 'bg-indigo-100 border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between gap-4 max-w-2xl">
            {/* Info */}
            <div className="flex items-center gap-3">
              <CheckSquare2 className={`h-5 w-5 ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  isDark ? 'text-white/90' : 'text-slate-900'
                }`}>
                  {selectedCount} selected
                </p>
                <p className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-slate-600'
                }`}>
                  {((selectedCount / totalCount) * 100).toFixed(0)}% of mappings
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {selectedCount === totalCount ? (
                <button
                  onClick={() => {
                    onClearSelection()
                    showToast('Selection cleared', 'info')
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    isDark
                      ? 'border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                      : 'border-slate-300 bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                  title="Deselect all"
                >
                  Deselect All
                </button>
              ) : (
                <button
                  onClick={handleSelectAll}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    isDark
                      ? 'border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                      : 'border-slate-300 bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                  title={`Select all ${totalCount} mappings`}
                >
                  Select All
                </button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onMarkReviewed()
                  showToast(`Marked ${selectedCount} mappings as reviewed`, 'success')
                  onClearSelection()
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  isDark
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/15'
                    : 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-200'
                }`}
              >
                <CheckSquare2 className="h-4 w-4" />
                Mark Reviewed
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onExportSelected()
                  showToast(`Exporting ${selectedCount} mappings...`, 'info')
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  isDark
                    ? 'border-blue-500/20 bg-blue-500/10 text-blue-300 hover:border-blue-500/30 hover:bg-blue-500/15'
                    : 'border-blue-300 bg-blue-100 text-blue-700 hover:border-blue-400 hover:bg-blue-200'
                }`}
              >
                <Download className="h-4 w-4" />
                Export
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClearSelection}
                className={`p-1.5 rounded-lg transition-all ${
                  isDark
                    ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Close toolbar"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
