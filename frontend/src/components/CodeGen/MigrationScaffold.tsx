import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Download, Terminal } from 'lucide-react'
import type { ReconciliationResult } from '../../types'
import { cn } from '@/lib/utils'

interface Props { result: ReconciliationResult }

export default function MigrationScaffold({ result }: Props) {
  const [copied, setCopied] = useState(false)

  const code = typeof result.migration_scaffold === 'string' && result.migration_scaffold
    ? result.migration_scaffold
    : '-- No migration scaffold generated.'

  const lines = code.split('\n')
  const byteSize = new Blob([code]).size
  const sizeLabel = byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    a.download = 'migration.sql'
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-4 w-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">migration.sql</span>
          <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/25">
            {lines.length} lines · {sizeLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <IconButton onClick={handleCopy} title="Copy">
            <motion.span
              key={copied ? 'check' : 'copy'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5"
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
              ) : (
                <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
              )}
            </motion.span>
          </IconButton>

          <IconButton onClick={handleDownload} title="Download">
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </IconButton>
        </div>
      </div>

      {/* Code block */}
      <div className="overflow-hidden rounded-xl border border-white/[0.07]">
        {/* Traffic-light bar */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="ml-2 text-[11px] text-white/20">SQL</span>
        </div>

        <div className="max-h-[520px] overflow-auto bg-[#080810]">
          <pre className="p-5 text-[0.8125rem] leading-relaxed">
            <code>
              {lines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="mr-5 w-8 shrink-0 select-none text-right text-white/[0.15] tabular-nums">
                    {i + 1}
                  </span>
                  <SqlLine line={line} />
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>

      {/* Tip */}
      <p className="text-xs text-white/20 leading-relaxed">
        Review this scaffold before running in production — type casts and constraints may need manual adjustment.
      </p>
    </div>
  )
}

function SqlLine({ line }: { line: string }) {
  if (line.startsWith('--')) {
    return <span className="text-white/25">{line}</span>
  }
  const keywords = /\b(BEGIN|COMMIT|CREATE|TABLE|IF|NOT|EXISTS|INSERT|INTO|SELECT|FROM|CAST|AS|NULL|DEFAULT|PRIMARY|KEY|INDEX|UNIQUE|ON|REFERENCES|WHERE|AND|OR|SET)\b/g

  const parts: { text: string; isKw: boolean }[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = keywords.exec(line)) !== null) {
    if (match.index > last) parts.push({ text: line.slice(last, match.index), isKw: false })
    parts.push({ text: match[0], isKw: true })
    last = match.index + match[0].length
  }
  if (last < line.length) parts.push({ text: line.slice(last), isKw: false })

  return (
    <span>
      {parts.map((p, i) =>
        p.isKw ? (
          <span key={i} className="text-indigo-300/70 font-medium">{p.text}</span>
        ) : (
          <span key={i} className="text-white/55">{p.text}</span>
        )
      )}
    </span>
  )
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04]',
        'px-3 py-1.5 text-xs font-medium text-white/40',
        'transition-all hover:border-white/[0.12] hover:bg-white/[0.07] hover:text-white/70'
      )}
    >
      {children}
    </button>
  )
}
