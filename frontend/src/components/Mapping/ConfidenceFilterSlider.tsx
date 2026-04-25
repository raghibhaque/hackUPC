import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'

interface Props {
  minConfidence: number
  onChange: (value: number) => void
  mappingsCount: number
  filteredCount: number
  isDark?: boolean
}

export default function ConfidenceFilterSlider({
  minConfidence,
  onChange,
  mappingsCount,
  filteredCount,
  isDark = true,
}: Props) {
  const percentage = minConfidence * 100

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${
      isDark
        ? 'border-white/[0.07] bg-white/[0.03]'
        : 'border-slate-300 bg-slate-100'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className={`h-4 w-4 ${
            isDark ? 'text-indigo-400' : 'text-indigo-600'
          }`} />
          <h3 className={`text-sm font-semibold ${
            isDark ? 'text-white/70' : 'text-slate-700'
          }`}>Confidence Filter</h3>
        </div>
        <div className={`text-xs font-mono ${
          isDark ? 'text-indigo-300' : 'text-indigo-600'
        }`}>{percentage.toFixed(0)}%</div>
      </div>

      {/* Slider */}
      <div className="space-y-3">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={percentage}
          onChange={(e) => onChange(parseInt(e.target.value) / 100)}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500`}
          style={{
            background: isDark
              ? `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`
              : `linear-gradient(to right, rgb(79, 70, 229) 0%, rgb(79, 70, 229) ${percentage}%, rgba(0,0,0,0.1) ${percentage}%, rgba(0,0,0,0.1) 100%)`,
          }}
        />

        {/* Labels */}
        <div className={`flex justify-between text-[10px] px-1 ${
          isDark ? 'text-white/40' : 'text-slate-600'
        }`}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        key={filteredCount}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs ${
          isDark
            ? 'bg-indigo-500/10 border-indigo-500/20'
            : 'bg-indigo-100 border-indigo-300'
        }`}
      >
        <span className={isDark ? 'text-white/60' : 'text-slate-700'}>
          Showing <span className={`font-semibold ${
            isDark ? 'text-indigo-300' : 'text-indigo-600'
          }`}>{filteredCount}</span> of{' '}
          <span className={`font-semibold ${
            isDark ? 'text-white/70' : 'text-slate-900'
          }`}>{mappingsCount}</span> mappings
        </span>
        {filteredCount < mappingsCount && (
          <span className={isDark ? 'text-white/40' : 'text-slate-600'}>
            ({((mappingsCount - filteredCount) / mappingsCount * 100).toFixed(0)}% hidden)
          </span>
        )}
      </motion.div>

      {/* Quick presets */}
      <div className="flex gap-2">
        {[
          { label: 'All', value: 0 },
          { label: 'Good', value: 0.6 },
          { label: 'Very Good', value: 0.8 },
          { label: 'Excellent', value: 0.9 },
        ].map((preset) => (
          <motion.button
            key={preset.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(preset.value)}
            className={`flex-1 rounded px-2.5 py-1.5 text-xs font-medium transition-all border ${
              Math.abs(minConfidence - preset.value) < 0.01
                ? isDark
                  ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                  : 'border-indigo-400 bg-indigo-200 text-indigo-700'
                : isDark
                  ? 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.12] hover:bg-white/[0.05]'
                  : 'border-slate-300 bg-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-300'
            }`}
          >
            {preset.label}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
