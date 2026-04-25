import { useState, useMemo } from 'react'

interface Props {
  sql: string
}

interface CodeSection {
  title: string
  start: number
  end: number
  tableA?: string
  tableB?: string
  hasConflicts: boolean
}

function tokenizeLine(line: string): Array<{ type: string; text: string }> {
  const keywords = /\b(CREATE|ALTER|TABLE|INSERT|INTO|SELECT|FROM|DROP|RENAME|COLUMN|TO|ADD|MODIFY|TYPE|VALUES|BEGIN|COMMIT|ROLLBACK|IF|EXISTS|CASCADE|NOT|NULL|PRIMARY|KEY|FOREIGN|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION|VARCHAR|INT|BIGINT|DECIMAL|FLOAT|DOUBLE|BOOLEAN|DATE|DATETIME|TIMESTAMP|TEXT|CHAR|BLOB|ENUM|SET|CAST|CASE|WHEN|THEN|ELSE|END|AND|OR|IN|LIKE|BETWEEN|AS|ON|WHERE|GROUP|BY|ORDER|LIMIT|OFFSET|WITH)\b/gi

  const tokens: Array<{ type: string; text: string }> = []
  let lastIndex = 0
  let match

  // Handle strings
  const stringRegex = /'([^'\\]|\\.)*'/g
  let stringMatches = []
  let stringMatch
  while ((stringMatch = stringRegex.exec(line)) !== null) {
    stringMatches.push({ start: stringMatch.index, end: stringMatch.index + stringMatch[0].length, text: stringMatch[0] })
  }

  // Handle comments
  const commentStart = line.indexOf('--')

  const keywordRegex = new RegExp(keywords.source, 'gi')
  while ((match = keywordRegex.exec(line)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    // Check if inside string
    if (stringMatches.some(s => matchStart >= s.start && matchStart < s.end)) {
      continue
    }

    // Check if inside comment
    if (commentStart !== -1 && matchStart >= commentStart) {
      break
    }

    if (matchStart > lastIndex) {
      const between = line.substring(lastIndex, matchStart)
      if (between.length > 0) tokens.push({ type: 'text', text: between })
    }

    tokens.push({ type: 'keyword', text: match[0] })
    lastIndex = matchEnd
  }

  // Add strings
  if (commentStart === -1) {
    // No comment, process normally
    const remaining = line.substring(lastIndex)
    if (remaining.length > 0) {
      let remainingProcessed = false
      for (const str of stringMatches) {
        if (str.start >= lastIndex) {
          if (str.start > lastIndex) {
            tokens.push({ type: 'text', text: line.substring(lastIndex, str.start) })
          }
          tokens.push({ type: 'string', text: str.text })
          lastIndex = str.end
          remainingProcessed = true
          break
        }
      }
      if (remainingProcessed && lastIndex < line.length) {
        tokens.push({ type: 'text', text: line.substring(lastIndex) })
      } else if (!remainingProcessed && remaining.length > 0) {
        tokens.push({ type: 'text', text: remaining })
      }
    }
  } else {
    // Has comment
    if (lastIndex < commentStart) {
      tokens.push({ type: 'text', text: line.substring(lastIndex, commentStart) })
    }
    tokens.push({ type: 'comment', text: line.substring(commentStart) })
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', text: line }]
}

export default function MigrationPreview({ sql }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))

  const lines = useMemo(() => sql.split('\n'), [sql])

  const sections = useMemo((): CodeSection[] => {
    const results: CodeSection[] = []
    let currentSection: CodeSection | null = null

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx]
      const tableMatch = line.match(/-- ─── (.+?) → (.+?) \(/)
      const hasConflicts = line.includes('⚠')

      if (tableMatch) {
        if (currentSection !== null) {
          currentSection.end = idx - 1
          results.push(currentSection)
        }
        currentSection = {
          title: `${tableMatch[1]} → ${tableMatch[2]}`,
          tableA: tableMatch[1],
          tableB: tableMatch[2],
          start: idx,
          end: idx,
          hasConflicts,
        }
      }
    }

    if (currentSection !== null) {
      currentSection.end = lines.length - 1
      results.push(currentSection)
    }

    return results
  }, [lines])

  const toggleSection = (idx: number) => {
    const next = new Set(expandedSections)
    if (next.has(idx)) {
      next.delete(idx)
    } else {
      next.add(idx)
    }
    setExpandedSections(next)
  }

  const previewLines = lines.slice(0, 50)
  const showExpandButton = lines.length > 50

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-medium text-white/80">Migration Preview</h4>
        <span className="text-xs text-white/40">{lines.length} lines</span>
      </div>

      {sections.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs text-white/50">Sections:</p>
          <div className="flex flex-wrap gap-2">
            {sections.map((section, idx) => (
              <button
                key={idx}
                onClick={() => toggleSection(idx)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  expandedSections.has(idx)
                    ? 'bg-indigo-500/30 text-indigo-300'
                    : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
                } ${section.hasConflicts ? 'border border-amber-500/30' : ''}`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative rounded-lg border border-white/[0.08] bg-[#0a0a12]/50 overflow-hidden">
        <pre className="text-xs font-mono leading-relaxed overflow-x-auto max-h-96 p-4 text-white/70">
          {previewLines.map((line, idx) => {
            const hasConflict = line.includes('⚠')
            const hasRisk = line.includes('RISK')
            const bgColor = hasConflict || hasRisk ? ' bg-orange-500/10' : ''

            return (
              <div
                key={idx}
                className={`flex gap-3 py-0.5${bgColor}`}
              >
                <span className="text-white/30 select-none min-w-[2rem]">{idx + 1}</span>
                <div>
                  {tokenizeLine(line).map((token, tokenIdx) => {
                    const textColor =
                      token.type === 'keyword' ? 'text-blue-400' :
                      token.type === 'string' ? 'text-emerald-400' :
                      token.type === 'comment' ? 'text-white/40' :
                      'text-white/70'

                    return (
                      <span key={tokenIdx} className={textColor}>
                        {token.text}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </pre>

        {showExpandButton && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center border-t border-white/[0.08] bg-gradient-to-t from-[#0a0a12] to-transparent p-2">
            <span className="text-xs text-white/40">
              +{lines.length - 50} more line{lines.length - 50 !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
