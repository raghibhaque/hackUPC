import jsPDF from 'jspdf'
import type { ReconciliationResult } from '../types'

export function generatePDFReport(result: ReconciliationResult): Blob {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth() as number
  const pageHeight = doc.internal.pageSize.getHeight() as number
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Helper function to add text with automatic pagination
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')

    const lines = doc.splitTextToSize(text, contentWidth) as string[]
    const lineHeight = fontSize * 0.35

    for (const line of lines) {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
      doc.text(line, margin, yPosition)
      yPosition += lineHeight
    }
  }

  const addSection = (title: string) => {
    if (yPosition > margin + 10) {
      yPosition += 5
    }
    addText(title, 16, true)
    yPosition += 2
  }

  const addKeyValue = (key: string, value: string | number) => {
    addText(`${key}: ${value}`, 11)
    yPosition += 2
  }

  // Title
  addText('SchemaSync Reconciliation Report', 18, true)
  yPosition += 8

  // Metadata
  addKeyValue('Generated', new Date().toLocaleString())
  yPosition += 5

  // Summary Section
  addSection('Summary')
  addKeyValue('Tables Matched', result.summary.tables_matched)
  addKeyValue('Tables in Source', result.summary.tables_in_a)
  addKeyValue('Tables in Target', result.summary.tables_in_b)
  addKeyValue('Average Confidence', `${(result.summary.average_confidence * 100).toFixed(1)}%`)
  addKeyValue('Total Conflicts', result.summary.total_conflicts)
  yPosition += 3

  // Table Mappings Section
  if (result.table_mappings && result.table_mappings.length > 0) {
    addSection('Table Mappings')

    for (const mapping of result.table_mappings) {
      if (yPosition > pageHeight - margin - 20) {
        doc.addPage()
        yPosition = margin
      }

      addText(
        `${mapping.table_a.name} → ${mapping.table_b.name}`,
        12,
        true
      )
      addKeyValue('Confidence', `${(mapping.confidence * 100).toFixed(1)}%`)

      const columnCount = mapping.column_mappings?.length || 0
      const unmatchedA = mapping.unmatched_columns_a?.length || 0
      const unmatchedB = mapping.unmatched_columns_b?.length || 0

      addKeyValue('Columns Mapped', columnCount)
      if (unmatchedA > 0) addKeyValue('Unmatched Source Columns', unmatchedA)
      if (unmatchedB > 0) addKeyValue('Unmatched Target Columns', unmatchedB)

      // Column mappings summary
      if (columnCount > 0) {
        yPosition += 2
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        const columnMappingsList = mapping.column_mappings
          ?.slice(0, 5) // Limit to first 5 for space
          .map(
            (cm) =>
              `  • ${cm.col_a.name} → ${cm.col_b.name} (${(cm.confidence * 100).toFixed(0)}%)`
          )
          .join('\n')

        if (columnMappingsList) {
          addText(columnMappingsList, 9)
        }

        if (columnCount > 5) {
          addText(`  ... and ${columnCount - 5} more columns`, 9)
        }
      }

      yPosition += 3
    }
  }

  // Conflicts Section
  if (result.summary.total_conflicts > 0) {
    addSection('Conflicts Summary')
    addKeyValue('Total Conflicts Found', result.summary.total_conflicts)
    addText(
      'Review individual table mappings for detailed conflict information.',
      10
    )
    yPosition += 3
  }

  // Unmatched Tables Section
  const hasUnmatchedA = result.unmatched_tables_a && result.unmatched_tables_a.length > 0
  const hasUnmatchedB = result.unmatched_tables_b && result.unmatched_tables_b.length > 0

  if (hasUnmatchedA || hasUnmatchedB) {
    addSection('Unmatched Tables')

    if (hasUnmatchedA) {
      addText('Source Tables Without Mappings:', 11, true)
      for (const table of (result.unmatched_tables_a || []).slice(0, 10)) {
        const tableName = typeof table === 'string' ? table : (table as any).name || 'Unknown'
        addText(`  • ${tableName}`, 10)
      }
      if ((result.unmatched_tables_a || []).length > 10) {
        addText(
          `  ... and ${(result.unmatched_tables_a || []).length - 10} more`,
          10
        )
      }
      yPosition += 2
    }

    if (hasUnmatchedB) {
      addText('Target Tables Without Mappings:', 11, true)
      for (const table of (result.unmatched_tables_b || []).slice(0, 10)) {
        const tableName = typeof table === 'string' ? table : (table as any).name || 'Unknown'
        addText(`  • ${tableName}`, 10)
      }
      if ((result.unmatched_tables_b || []).length > 10) {
        addText(
          `  ... and ${(result.unmatched_tables_b || []).length - 10} more`,
          10
        )
      }
    }
  }

  // Footer
  yPosition = pageHeight - margin - 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generated by SchemaSync on ${new Date().toLocaleString()}`,
    margin,
    yPosition
  )

  return doc.output('blob')
}
