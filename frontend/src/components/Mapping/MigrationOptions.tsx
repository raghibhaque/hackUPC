import { useState, useEffect } from 'react'
import type { SQLDialect } from '../../lib/sqlDialect'

interface Props {
  onDialectChange?: (dialect: SQLDialect) => void
}

export default function MigrationOptions({ onDialectChange }: Props) {
  const [dialect, setDialect] = useState<SQLDialect>('mysql')

  useEffect(() => {
    const stored = localStorage.getItem('schemasync:migration-dialect')
    if (stored && ['mysql', 'postgresql', 'generic'].includes(stored)) {
      setDialect(stored as SQLDialect)
      onDialectChange?.(stored as SQLDialect)
    }
  }, [onDialectChange])

  const handleDialectChange = (newDialect: SQLDialect) => {
    setDialect(newDialect)
    localStorage.setItem('schemasync:migration-dialect', newDialect)
    onDialectChange?.(newDialect)
  }

  const options: Array<{ value: SQLDialect; label: string; description: string }> = [
    {
      value: 'mysql',
      label: 'MySQL',
      description: 'MySQL 5.7+ / MariaDB 10.3+',
    },
    {
      value: 'postgresql',
      label: 'PostgreSQL',
      description: 'PostgreSQL 11+',
    },
    {
      value: 'generic',
      label: 'Generic SQL',
      description: 'Platform-agnostic (manual fixes needed)',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <label className="text-sm font-medium text-white/80">SQL Dialect</label>
        <span className="text-xs text-white/40">for migration output</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => handleDialectChange(option.value)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              dialect === option.value
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2]'
            }`}
          >
            <div className="font-medium text-sm text-white">{option.label}</div>
            <div className="text-xs text-white/50 mt-1">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
