import type { UploadState, ReconciliationResult } from '../../types'

type Props = {
  state: UploadState
  onStateChange: (s: UploadState) => void
  onComplete: (r: ReconciliationResult) => void
}

export default function UploadPanel({ onStateChange, onComplete }: Props) {
  return (
    <div>
      <p className="text-slate-600 mb-4">Upload your schemas here</p>

      <button
        onClick={() => {
          onStateChange({ isLoading: true })

          // TEMP MOCK — replace with API call later
          setTimeout(() => {
            onComplete({
              summary: {
                tables_matched: 1,
                tables_in_a: 1,
                tables_in_b: 1,
                average_confidence: 0.9,
                total_conflicts: 0,
                critical_conflicts: 0,
              },
              table_mappings: [],
              unmatched_tables_a: [],
              unmatched_tables_b: [],
              migration_scaffold: '-- demo sql'
            } as unknown as ReconciliationResult)
          }, 1000)
        }}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Run Demo
      </button>
    </div>
  )
}