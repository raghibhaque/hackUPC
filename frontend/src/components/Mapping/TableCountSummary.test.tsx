import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableCountSummary } from './TableCountSummary'
import type { ReconciliationResult } from '@/types'

const createMockMapping = (tableName: string, conflicts = false) => ({
  table_a: { name: tableName, columns: [] },
  table_b: { name: `new_${tableName}`, columns: [] },
  confidence: 0.9,
  confidence_label: 'HIGH' as const,
  structural_score: 0.9,
  semantic_score: 0.9,
  column_mappings: conflicts
    ? [
        {
          col_a: { name: 'id', data_type: { base_type: 'INT' } },
          col_b: { name: `${tableName}_id`, data_type: { base_type: 'BIGINT' } },
          confidence: 0.99,
          mapping_type: 'primary_key' as const,
          conflicts: [{ type: 'type_mismatch' as const }],
        },
      ]
    : [],
  unmatched_columns_a: [],
  unmatched_columns_b: [],
})

const mockResult: ReconciliationResult = {
  summary: {
    tables_matched: 5,
    tables_in_a: 7,
    tables_in_b: 6,
    average_confidence: 0.85,
    total_conflicts: 2,
    critical_conflicts: 0,
    columns_matched: 45,
  },
  table_mappings: [
    createMockMapping('users', false),
    createMockMapping('orders', true),
    createMockMapping('products', false),
    createMockMapping('categories', false),
    createMockMapping('reviews', false),
  ],
  unmatched_tables_a: ['temp_logs', 'cache_data'],
  unmatched_tables_b: ['analytics'],
  migration_scaffold: 'BEGIN; COMMIT;',
}

describe('TableCountSummary', () => {
  it('renders the component', () => {
    render(<TableCountSummary result={mockResult} />)
    expect(screen.getByText('Table Summary')).toBeInTheDocument()
  })

  it('displays matched tables count correctly', () => {
    render(<TableCountSummary result={mockResult} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('displays unmatched source tables', () => {
    render(<TableCountSummary result={mockResult} />)
    expect(screen.getByText('Source Only')).toBeInTheDocument()
    const sourceOnlySection = screen.getByText('Source Only').closest('div')
    expect(sourceOnlySection).toHaveTextContent('2')
  })

  it('displays unmatched target tables', () => {
    render(<TableCountSummary result={mockResult} />)
    expect(screen.getByText('Target Only')).toBeInTheDocument()
    const targetOnlySection = screen.getByText('Target Only').closest('div')
    expect(targetOnlySection).toHaveTextContent('1')
  })

  it('displays summary line with total matched and unmatched', () => {
    render(<TableCountSummary result={mockResult} />)
    expect(screen.getByText(/5 tables matched/)).toBeInTheDocument()
    expect(screen.getByText(/3 unmatched/)).toBeInTheDocument()
  })

  it('counts tables with conflicts correctly', () => {
    render(<TableCountSummary result={mockResult} />)
    expect(screen.getByText('Conflicts')).toBeInTheDocument()
  })

  it('handles empty results gracefully', () => {
    const emptyResult: ReconciliationResult = {
      summary: {
        tables_matched: 0,
        tables_in_a: 0,
        tables_in_b: 0,
        average_confidence: 0,
        total_conflicts: 0,
        critical_conflicts: 0,
      },
      table_mappings: [],
      unmatched_tables_a: [],
      unmatched_tables_b: [],
      migration_scaffold: '',
    }
    render(<TableCountSummary result={emptyResult} />)
    expect(screen.getByText('Table Summary')).toBeInTheDocument()
  })
})
