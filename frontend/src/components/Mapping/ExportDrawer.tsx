import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Copy, Check, FileText } from 'lucide-react'
import { useState } from 'react'
import type { ReconciliationResult } from '../../types'
import { EXPORT_FORMATS } from '../../lib/exportFormats'
import { generatePDFReport } from '../../lib/pdfReportGenerator'
import { showToast } from '../../lib/toast'

interface Props {
  result: ReconciliationResult | null
  onClose: () => void
}

export default function ExportDrawer({ result, onClose }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!result) return null

  const handleDownload = (formatId: string) => {
    const format = EXPORT_FORMATS.find((f) => f.id === formatId)
    if (!format) return

    const content = format.generator(result)
    const blob = new Blob([content], { type: format.mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = format.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = () => {
    try {
      const blob = generatePDFReport(result)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'schemasync-reconciliation-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
      showToast('PDF report downloaded successfully', 'success')
    } catch (error) {
      showToast('Failed to generate PDF report', 'error')
      console.error('PDF generation error:', error)
    }
  }

  const handleCopy = (formatId: string) => {
    const format = EXPORT_FORMATS.find((f) => f.id === formatId)
    if (!format) return

    const content = format.generator(result)
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(formatId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <AnimatePresence>
      {result && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full overflow-y-auto border-l border-white/[0.07] bg-[#0a0a12] sm:max-w-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-white/[0.07] bg-[#06060e]/80 px-6 py-4 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-semibold text-white/80">Export & Reports</h2>
                <p className="mt-1 text-xs text-white/40">
                  Generate migration files and reports
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-white/40 transition-colors hover:text-white/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] p-4">
                <p className="text-xs text-blue-200">
                  <span className="font-medium">Info:</span> All exports include table/column mappings with confidence scores and TODO comments for conflicts and unmatched columns.
                </p>
              </div>

              {/* PDF Report Section */}
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white/80">PDF Report</h3>
                    <p className="mt-1 text-xs text-white/40">
                      schemasync-reconciliation-report.pdf
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={handleDownloadPDF}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 rounded bg-indigo-500/20 px-3 py-2 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/30"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Download PDF
                </motion.button>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-white/80">Migration Formats</h3>
                {EXPORT_FORMATS.map((format) => (
                  <div
                    key={format.id}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-white/80">
                          {format.name}
                        </h4>
                        <p className="mt-1 text-xs text-white/40">
                          {format.filename}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => handleDownload(format.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 rounded bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </motion.button>

                      <motion.button
                        onClick={() => handleCopy(format.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-1.5 rounded px-3 py-2 text-xs font-medium transition-colors ${
                          copiedId === format.id
                            ? 'bg-blue-500/30 text-blue-300'
                            : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]'
                        }`}
                      >
                        {copiedId === format.id ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border-l-4 border-l-amber-500 bg-amber-500/[0.06] p-4">
                <p className="text-xs text-amber-200">
                  <span className="font-medium">Next steps:</span> Review the generated migration files carefully. All TODO comments indicate areas requiring manual review or implementation.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
