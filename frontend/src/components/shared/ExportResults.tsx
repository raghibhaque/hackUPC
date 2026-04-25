import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Download, Copy, Check } from 'lucide-react'
import type { ReconciliationResult } from '../../types'
import { showToast } from '../../lib/toast'
import { cn } from '@/lib/utils'

interface Props {
  result: ReconciliationResult
}

type Format = 'json' | 'csv'

export default function ExportResults({ result }: Props) {
  const [selectedFormat, setSelectedFormat] = useState<Format>('json')
  const [copied, setCopied] = useState(false)

  const exportData = useMemo(() => {
    if (selectedFormat === 'json') {
      const data = {
        timestamp: new Date().toISOString(),
        summary: result.summary,
        table_mappings: result.table_mappings.map(m => ({
          source: m.table_a.name,
          target: m.table_b.name,
          confidence: m.confidence,
          structural_score: m.structural_score,
          semantic_score: m.semantic_score,
          columns_matched: m.column_mappings.length,
          column_details: m.column_mappings.map(col => ({
            source_column: col.col_a.name,
            target_column: col.col_b.name,
            source_type: col.col_a.data_type.base_type,
            target_type: col.col_b.data_type.base_type,
            confidence: col.confidence,
            conflicts_count: col.conflicts.length,
          })),
        })),
        unmatched_tables: result.unmatched_tables_a,
      }
      return JSON.stringify(data, null, 2)
    }

    // CSV format
    const lines = [
      'Table Mapping Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      'Summary',
      `Total Tables Analyzed,${result.summary.tables_in_a + result.summary.tables_in_b}`,
      `Tables Matched,${result.summary.tables_matched}`,
      `Unmatched Tables,${result.unmatched_tables_a.length}`,
      `Average Confidence,${(result.summary.average_confidence * 100).toFixed(2)}%`,
      `Total Conflicts,${result.summary.total_conflicts}`,
      '',
      'Table Mappings',
      'Source Table,Target Table,Confidence,Structural Score,Semantic Score,Columns,Conflicts',
      ...result.table_mappings.map(m =>
        `${m.table_a.name},${m.table_b.name},${(m.confidence * 100).toFixed(1)}%,${(m.structural_score * 100).toFixed(1)}%,${(m.semantic_score * 100).toFixed(1)}%,${m.column_mappings.length},${m.column_mappings.reduce((sum, col) => sum + col.conflicts.length, 0)}`
      ),
      '',
      'Column Mappings',
      'Source Table,Source Column,Source Type,Target Table,Target Column,Target Type,Confidence',
      ...result.table_mappings.flatMap(m =>
        m.column_mappings.map(col =>
          `${m.table_a.name},${col.col_a.name},${col.col_a.data_type.base_type},${m.table_b.name},${col.col_b.name},${col.col_b.data_type.base_type},${(col.confidence * 100).toFixed(1)}%`
        )
      ),
      ...(result.unmatched_tables_a.length > 0 ? [
        '',
        'Unmatched Tables',
        'Table Name',
        ...result.unmatched_tables_a,
      ] : []),
    ]
    return lines.join('\n')
  }, [selectedFormat, result])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData)
      setCopied(true)
      showToast(`${selectedFormat.toUpperCase()} copied to clipboard`, 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const handleDownload = () => {
    try {
      const a = document.createElement('a')
      const ext = selectedFormat === 'json' ? 'json' : 'csv'
      const mimeType = selectedFormat === 'json' ? 'application/json' : 'text/csv'
      a.href = URL.createObjectURL(new Blob([exportData], { type: mimeType }))
      a.download = `reconciliation-results.${ext}`
      a.click()
      showToast(`reconciliation-results.${ext} downloaded`, 'success')
    } catch {
      showToast('Failed to download file', 'error')
    }
  }

  const formatSize = (new Blob([exportData]).size / 1024).toFixed(1)

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70">Export Results</h3>
        <div className="text-xs text-white/40">{formatSize} KB</div>
      </div>

      {/* Format selector */}
      <div className="flex gap-2">
        {(['json', 'csv'] as const).map(fmt => (
          <motion.button
            key={fmt}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedFormat(fmt)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              selectedFormat === fmt
                ? 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                : 'border border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.12] hover:bg-white/[0.05]'
            )}
          >
            .{fmt.toUpperCase()}
          </motion.button>
        ))}
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 max-h-40 overflow-hidden">
        <pre className="text-[10px] text-white/40 font-mono overflow-auto">
          {exportData.slice(0, 300)}...
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/70 hover:border-white/[0.14] hover:bg-white/[0.07] transition-all"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:border-indigo-500/30 hover:bg-indigo-500/15 transition-all"
        >
          <Download className="h-4 w-4" />
          Download
        </motion.button>
      </div>
    </div>
  )
}
