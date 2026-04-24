import type { ReconciliationResult } from '../../types'

type Props = {
  result: ReconciliationResult
}

export default function MappingTable({ result }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Mappings</h2>

      {result.table_mappings?.length === 0 ? (
        <p className="text-slate-600">No mappings yet</p>
      ) : (
        <ul>
          {result.table_mappings.map((m, i) => (
            <li key={i}>
              {m.table_a.name} → {m.table_b.name} ({m.confidence})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}