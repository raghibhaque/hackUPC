import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare2, Download, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { showToast } from '../../lib/toast'

interface Props {
  selectedCount: number
  totalCount: number
  highConfidenceCount?: number
  conflictFreeCount?: number
  onMarkReviewed: () => void
  onMarkUnreviewed?: () => void
  onExportSelected: () => void
  onClearSelection: () => void
  onSelectAll: () => void
  onSelectHighConfidence?: () => void
  onSelectConflictFree?: () => void
}

export default function BulkActionBar({
  selectedCount,
  totalCount,
  highConfidenceCount = 0,
  conflictFreeCount = 0,
  onMarkReviewed,
  onMarkUnreviewed,
  onExportSelected,
  onClearSelection,
  onSelectAll,
  onSelectHighConfidence,
  onSelectConflictFree,
}: Props) {
  const [showSelectMenu, setShowSelectMenu] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState<{ action: 'reviewed' | 'unreviewed'; count: number } | null>(null)

  const handleMarkReviewed = () => {
    if (selectedCount > 10) {
      setShowConfirmation({ action: 'reviewed', count: selectedCount })
    } else {
      confirmMarkReviewed()
    }
  }

  const confirmMarkReviewed = () => {
    onMarkReviewed()
    showToast(`Marked ${selectedCount} mappings as reviewed`, 'success')
    onClearSelection()
    setShowConfirmation(null)
  }

  const confirmMarkUnreviewed = () => {
    onMarkUnreviewed?.()
    showToast(`Marked ${selectedCount} mappings as unreviewed`, 'success')
    onClearSelection()
    setShowConfirmation(null)
  }

  const handleMarkUnreviewed = () => {
    if (selectedCount > 10) {
      setShowConfirmation({ action: 'unreviewed', count: selectedCount })
    } else {
      confirmMarkUnreviewed()
    }
  }

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-4 shadow-lg backdrop-blur-sm"
          >
            <div className="flex max-w-2xl items-center justify-between gap-4">
              {/* Info */}
              <div className="flex items-center gap-3">
                <CheckSquare2 className="h-5 w-5 text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-white/90">
                    {selectedCount} selected
                  </p>
                  <p className="text-xs text-white/50">
                    {((selectedCount / totalCount) * 100).toFixed(0)}% of mappings
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSelectMenu(!showSelectMenu)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.08]"
                  >
                    More
                    <ChevronDown className="h-3 w-3" />
                  </motion.button>

                  <AnimatePresence>
                    {showSelectMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-2 rounded-lg border border-white/[0.08] bg-white/[0.05] shadow-xl backdrop-blur-sm w-48 z-50"
                      >
                        <button
                          onClick={() => {
                            onSelectAll()
                            setShowSelectMenu(false)
                            showToast(`Selected all ${totalCount} visible mappings`, 'info')
                          }}
                          className="block w-full px-4 py-2 text-left text-xs text-white/70 hover:bg-white/[0.08] hover:text-white/90 transition-colors first:rounded-t-lg"
                        >
                          Select All Visible ({totalCount})
                        </button>
                        {highConfidenceCount > 0 && (
                          <button
                            onClick={() => {
                              onSelectHighConfidence?.()
                              setShowSelectMenu(false)
                              showToast(`Selected ${highConfidenceCount} high-confidence mappings`, 'info')
                            }}
                            className="block w-full px-4 py-2 text-left text-xs text-white/70 hover:bg-white/[0.08] hover:text-white/90 transition-colors"
                          >
                            Select High Confidence ({highConfidenceCount})
                          </button>
                        )}
                        {conflictFreeCount > 0 && (
                          <button
                            onClick={() => {
                              onSelectConflictFree?.()
                              setShowSelectMenu(false)
                              showToast(`Selected ${conflictFreeCount} conflict-free mappings`, 'info')
                            }}
                            className="block w-full px-4 py-2 text-left text-xs text-white/70 hover:bg-white/[0.08] hover:text-white/90 transition-colors last:rounded-b-lg"
                          >
                            Select Conflict-Free ({conflictFreeCount})
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {selectedCount === totalCount ? (
                  <button
                    onClick={() => {
                      onClearSelection()
                      showToast('Selection cleared', 'info')
                    }}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.08]"
                    title="Deselect all"
                  >
                    Deselect All
                  </button>
                ) : null}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMarkReviewed}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/15"
                  title="Mark selected as reviewed"
                >
                  <CheckSquare2 className="h-4 w-4" />
                  Mark Reviewed
                </motion.button>

                {onMarkUnreviewed && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMarkUnreviewed}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-all hover:border-amber-500/30 hover:bg-amber-500/15"
                    title="Mark selected as unreviewed"
                  >
                    Unmark
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onExportSelected()
                    showToast(`Exporting ${selectedCount} mappings...`, 'info')
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-all hover:border-blue-500/30 hover:bg-blue-500/15"
                >
                  <Download className="h-4 w-4" />
                  Export
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClearSelection}
                  className="rounded-lg p-1.5 text-white/40 transition-all hover:bg-white/[0.05] hover:text-white/60"
                  title="Close toolbar"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Confirmation Modal */}
          <AnimatePresence>
            {showConfirmation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfirmation(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.05] p-6 backdrop-blur-sm max-w-sm"
                >
                  <h3 className="text-lg font-semibold text-white/90 mb-2">
                    Confirm Bulk Action
                  </h3>
                  <p className="text-sm text-white/60 mb-6">
                    Are you sure you want to mark {showConfirmation.count} mappings as{' '}
                    <span className="font-medium text-white/80">
                      {showConfirmation.action === 'reviewed' ? 'reviewed' : 'unreviewed'}
                    </span>
                    ? This action can be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmation(null)}
                      className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.08]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (showConfirmation.action === 'reviewed') {
                          confirmMarkReviewed()
                        } else {
                          confirmMarkUnreviewed()
                        }
                      }}
                      className={`flex-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                        showConfirmation.action === 'reviewed'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/15'
                          : 'border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/15'
                      }`}
                    >
                      {showConfirmation.action === 'reviewed' ? 'Mark Reviewed' : 'Mark Unreviewed'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}
