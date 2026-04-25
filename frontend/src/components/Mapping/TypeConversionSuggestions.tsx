import { motion } from 'framer-motion'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTypeConversions, getConversionRiskColor, getConversionRiskBg } from '../../hooks/useTypeConversions'

interface Props {
  sourceType: string
  targetType: string
  onSelectConversion?: (conversion: string) => void
}

export default function TypeConversionSuggestions({
  sourceType,
  targetType,
  onSelectConversion,
}: Props) {
  const conversions = useTypeConversions(sourceType, targetType)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  if (!conversions) return null

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-lg border p-4 space-y-3',
        getConversionRiskBg(conversions.riskLevel),
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className={cn('text-sm font-bold', getConversionRiskColor(conversions.riskLevel))}>
            Type Conversion Required
          </h4>
          <p className="text-xs text-white/50 mt-1">
            Converting {conversions.fromType} → {conversions.toType}
          </p>
        </div>
        <span className={cn(
          'text-[10px] font-bold uppercase px-2 py-1 rounded',
          conversions.riskLevel === 'high'
            ? 'bg-rose-500/20 text-rose-300'
            : conversions.riskLevel === 'medium'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-emerald-500/20 text-emerald-300'
        )}>
          {conversions.riskLevel} risk
        </span>
      </div>

      {conversions.dataLossWarning && (
        <div className="flex gap-2 items-start text-xs text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded p-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{conversions.dataLossWarning}</span>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/70">Recommended conversions:</p>
        {conversions.functions.map((fn, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white/[0.03] border border-white/[0.08] rounded p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">{fn.name}</p>
                <p className="text-xs text-white/50">{fn.description}</p>
              </div>
              <button
                onClick={() => handleCopy(fn.syntax, i)}
                className="p-1.5 hover:bg-white/[0.1] rounded transition-colors"
              >
                {copiedIndex === i ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4 text-white/40" />
                )}
              </button>
            </div>

            <code className="block bg-black/30 border border-white/[0.05] rounded px-2 py-1.5 font-mono text-[11px] text-cyan-300 overflow-x-auto">
              {fn.syntax}
            </code>

            {fn.example && (
              <div className="text-xs text-white/60">
                <span className="font-semibold">Example:</span> {fn.example}
              </div>
            )}

            {fn.dataLoss && (
              <div className="text-xs text-amber-200 flex gap-1 items-start">
                <span className="text-amber-400">⚠️</span>
                <span>{fn.dataLoss}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
