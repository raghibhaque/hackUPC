import { useState } from 'react'
import { Code, AlertCircle, CheckCircle2, Copy } from 'lucide-react'
import { parseJSONSchema, validateJSONSchema, getJSONSchemaExample } from '../../lib/jsonSchemaParser'
import type { Table } from '../../types'

interface Props {
  onSchemaParsed: (tables: Table[]) => void
}

export default function JSONSchemaImporter({ onSchemaParsed }: Props) {
  const [schemaContent, setSchemaContent] = useState('')
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parsedTables, setParsedTables] = useState<Table[]>([])
  const [showExample, setShowExample] = useState(false)

  const handleParse = () => {
    const validation = validateJSONSchema(schemaContent)

    if (!validation.valid) {
      setParseErrors(validation.errors)
      setParsedTables([])
      return
    }

    try {
      const tables = parseJSONSchema(schemaContent)
      if (tables.length === 0) {
        setParseErrors(['No valid schemas found'])
        setParsedTables([])
      } else {
        setParseErrors([])
        setParsedTables(tables)
        onSchemaParsed(tables)
      }
    } catch (err) {
      setParseErrors([err instanceof Error ? err.message : 'Unknown parse error'])
      setParsedTables([])
    }
  }

  const handleLoadExample = () => {
    const example = getJSONSchemaExample()
    setSchemaContent(example)
    setShowExample(false)
  }

  const handleCopyExample = async () => {
    const example = getJSONSchemaExample()
    await navigator.clipboard.writeText(example)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Code size={18} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-white/80">JSON Schema Import</h3>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/60">Paste your JSON Schema content:</label>

        <textarea
          value={schemaContent}
          onChange={(e) => setSchemaContent(e.target.value)}
          placeholder="Paste JSON Schema here..."
          className="w-full h-32 bg-white/[0.05] border border-white/[0.1] rounded px-3 py-2 text-xs font-mono text-white/70 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
        />

        <div className="flex gap-2">
          <button
            onClick={handleParse}
            disabled={!schemaContent.trim()}
            className="flex-1 px-3 py-2 rounded text-xs font-medium bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Parse Schema
          </button>
          <button
            onClick={() => setShowExample(!showExample)}
            className="px-3 py-2 rounded text-xs font-medium bg-white/[0.05] text-white/60 hover:bg-white/[0.08] transition-colors"
          >
            {showExample ? 'Hide' : 'Show'} Example
          </button>
        </div>
      </div>

      {showExample && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/50">Example JSON Schema:</p>
            <button
              onClick={handleCopyExample}
              className="text-xs px-2 py-1 rounded bg-white/[0.05] text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
          <pre className="text-[10px] font-mono text-white/50 overflow-x-auto max-h-40 bg-black/20 rounded p-2">
            {getJSONSchemaExample()}
          </pre>
          <button
            onClick={handleLoadExample}
            className="w-full text-xs px-2 py-1 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors"
          >
            Load This Example
          </button>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded p-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
            <p className="text-xs font-medium text-rose-300">Parse Errors:</p>
          </div>
          <ul className="space-y-0.5">
            {parseErrors.map((error, idx) => (
              <li key={idx} className="text-xs text-rose-200/70">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsedTables.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <p className="text-xs font-medium text-emerald-300">
              Successfully parsed {parsedTables.length} table{parsedTables.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="grid gap-1">
            {parsedTables.map(table => (
              <div key={table.name} className="text-xs text-emerald-200/70 px-2 py-1 rounded bg-emerald-500/10">
                <span className="font-mono text-emerald-300">{table.name}</span>
                <span className="text-white/40"> ({table.columns.length} columns)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
