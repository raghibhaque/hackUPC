import type { ReconciliationResult } from '../../types'

type Props = {
  result: ReconciliationResult
}

export default function ConflictReport({ result }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Conflicts</h2>
      <p className="text-slate-600">
        Total conflicts: {result.summary.total_conflicts}
      </p>
    </div>
  )
}