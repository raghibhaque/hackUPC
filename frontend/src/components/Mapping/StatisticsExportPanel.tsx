import { motion, AnimatePresence } from 'framer-motion'
import { Download, Copy, FileJson, FileText } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ReconciliationResult } from '../../types'
import {
  generateStatisticsExport,
  exportAsJSON,
  exportAsCSV,
  downloadFile,
  copyToClipboard,
} from '../../lib/statisticsExport'

interface Props {
  result: ReconciliationResult
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'json' | 'csv'
type CopyStatus = null | 'success' | 'error'

export default function StatisticsExportPanel({ result, isOpen, onClose }: Props) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const schemaName = result.summary?.schema_name || 'Schema'
  const exportData = generateStatisticsExport(result, schemaName)

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true)
    try {
      const content = format === 'json' ? exportAsJSON(exportData) : exportAsCSV(exportData)
      const ext = format === 'json' ? 'json' : 'csv'
      const filename = `schema-statistics_${new Date().toISOString().split('T')[0]}.${ext}`

      downloadFile(content, filename, format === 'json' ? 'application/json' : 'text/csv')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopy = async (format: ExportFormat) => {
    try {
      const content = format === 'json' ? exportAsJSON(exportData) : exportAsCSV(exportData)
      await copyToClipboard(content)
      setCopyStatus('success')
      setTimeout(() => setCopyStatus(null), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus(null), 2000)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.05 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -4 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-full max-w-md rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/[0.1] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="border-b border-white/[0.05] bg-white/[0.02] backdrop-blur px-5 sm:px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Export Statistics</h2>
              <p className="text-xs text-white/50 mt-1">
                Download or copy your schema statistics
              </p>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Format Selection */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                  Format
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'json', label: 'JSON', icon: FileJson, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                    { id: 'csv', label: 'CSV', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  ].map(format => (
                    <motion.button
                      key={format.id}
                      variants={itemVariants}
                      onClick={() => setSelectedFormat(format.id as ExportFormat)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                        selectedFormat === format.id
                          ? `${format.bg} ring-2 ring-offset-0`
                          : 'border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05]'
                      )}
                    >
                      <format.icon className={cn('h-4 w-4', format.color)} />
                      <span className={cn(
                        'text-xs font-medium',
                        selectedFormat === format.id ? format.color : 'text-white/60'
                      )}>
                        {format.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Preview Stats */}
              <motion.div
                variants={itemVariants}
                className="space-y-2 bg-white/[0.02] border border-white/[0.05] rounded-lg p-3"
              >
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                  Export Summary
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-white/50">Tables</p>
                    <p className="font-semibold text-white/90">{exportData.summary.totalTables}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Columns</p>
                    <p className="font-semibold text-white/90">{exportData.summary.totalColumns}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Mapped</p>
                    <p className="font-semibold text-white/90">{exportData.summary.totalMappedColumns}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Conflicts</p>
                    <p className={cn(
                      'font-semibold',
                      exportData.summary.totalConflicts > 0 ? 'text-rose-300' : 'text-white/90'
                    )}>
                      {exportData.summary.totalConflicts}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <motion.button
                  variants={itemVariants}
                  onClick={() => handleExport(selectedFormat)}
                  disabled={isExporting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 hover:border-indigo-500/40 text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  <span>{isExporting ? 'Exporting...' : `Download ${selectedFormat.toUpperCase()}`}</span>
                </motion.button>

                <motion.button
                  variants={itemVariants}
                  onClick={() => handleCopy(selectedFormat)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full py-2 px-3 rounded-lg border transition-all text-sm font-medium flex items-center justify-center gap-2',
                    copyStatus === 'success'
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      : copyStatus === 'error'
                        ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                        : 'bg-white/[0.05] border-white/[0.1] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white/90'
                  )}
                >
                  <Copy className="h-4 w-4" />
                  <span>
                    {copyStatus === 'success'
                      ? 'Copied!'
                      : copyStatus === 'error'
                        ? 'Copy failed'
                        : `Copy to Clipboard`}
                  </span>
                </motion.button>

                <motion.button
                  variants={itemVariants}
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 px-3 rounded-lg border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05] text-xs font-medium text-white/60 hover:text-white/80 transition-all"
                >
                  Close
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
