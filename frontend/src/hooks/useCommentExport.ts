import { useCallback } from 'react'
import { commentExporter, type ExportFormat } from '../lib/commentExport'
import type { CommentThread } from '../lib/comments'

export function useCommentExport() {
  const exportComments = useCallback((threads: CommentThread[], format: ExportFormat, title = 'Comments Export') => {
    let content: string
    let filename: string

    switch (format) {
      case 'json':
        content = commentExporter.exportAsJSON(threads, title)
        break
      case 'csv':
        content = commentExporter.exportAsCSV(threads)
        break
      case 'markdown':
        content = commentExporter.exportAsMarkdown(threads, title)
        break
      default:
        throw new Error(`Unknown export format: ${format}`)
    }

    filename = commentExporter.generateFilename(format, title)

    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const exportAsJSON = useCallback((threads: CommentThread[], title?: string) => {
    exportComments(threads, 'json', title)
  }, [exportComments])

  const exportAsCSV = useCallback((threads: CommentThread[], title?: string) => {
    exportComments(threads, 'csv', title)
  }, [exportComments])

  const exportAsMarkdown = useCallback((threads: CommentThread[], title?: string) => {
    exportComments(threads, 'markdown', title)
  }, [exportComments])

  return {
    exportComments,
    exportAsJSON,
    exportAsCSV,
    exportAsMarkdown,
  }
}
