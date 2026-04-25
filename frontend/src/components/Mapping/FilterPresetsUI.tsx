import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { FilterPreset } from '../../hooks/useFilterPresets'

interface Props {
  presets: FilterPreset[]
  activePresetId: string | null
  onApplyPreset: (preset: FilterPreset) => void
  onSavePreset: (name: string) => void
  onDeletePreset: (id: string) => void
  isDark: boolean
}

export default function FilterPresetsUI({
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  isDark,
}: Props) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState('')

  const handleSave = () => {
    if (presetName.trim()) {
      onSavePreset(presetName)
      setPresetName('')
      setShowSaveDialog(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map((preset) => (
          <motion.button
            key={preset.id}
            onClick={() => onApplyPreset(preset)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activePresetId === preset.id
                ? isDark
                  ? 'bg-indigo-500/40 text-indigo-200 border border-indigo-500/60'
                  : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : isDark
                  ? 'bg-white/[0.08] text-white/70 border border-white/[0.1] hover:bg-white/[0.12]'
                  : 'bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300'
            }`}
          >
            {preset.name}
          </motion.button>
        ))}

        <motion.button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            showSaveDialog
              ? isDark
                ? 'bg-emerald-500/40 text-emerald-200 border border-emerald-500/60'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : isDark
                ? 'bg-white/[0.08] text-white/70 border border-white/[0.1] hover:bg-white/[0.12]'
                : 'bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Save
        </motion.button>
      </div>

      {showSaveDialog && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`flex gap-2 p-3 rounded-lg border ${
            isDark
              ? 'bg-white/[0.05] border-white/[0.1]'
              : 'bg-slate-100 border-slate-300'
          }`}
        >
          <input
            type="text"
            placeholder="Preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setShowSaveDialog(false)
                setPresetName('')
              }
            }}
            autoFocus
            className={`flex-1 px-2.5 py-1.5 rounded text-xs transition-colors focus:outline-none ${
              isDark
                ? 'bg-white/[0.08] border-white/[0.1] text-white/80 placeholder-white/30 focus:bg-white/[0.12]'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:bg-slate-50'
            }`}
          />
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isDark
                ? 'bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/50'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            Save
          </motion.button>
          <motion.button
            onClick={() => {
              setShowSaveDialog(false)
              setPresetName('')
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-2 py-1.5 rounded transition-colors ${
              isDark
                ? 'text-white/40 hover:text-white/60'
                : 'text-slate-600 hover:text-slate-700'
            }`}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </motion.div>
      )}

      {/* Custom presets with delete buttons */}
      {presets.some((p) => p.type === 'custom') && (
        <div className="space-y-2 border-t pt-3">
          {presets
            .filter((p) => p.type === 'custom')
            .map((preset) => (
              <div
                key={preset.id}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  isDark
                    ? 'bg-white/[0.05] border-white/[0.1] hover:bg-white/[0.08]'
                    : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <button
                  onClick={() => onApplyPreset(preset)}
                  className="flex-1 text-left"
                >
                  <p className={`text-xs font-medium ${
                    isDark ? 'text-white/70' : 'text-slate-700'
                  }`}>
                    {preset.name}
                  </p>
                  <p className={`text-[11px] ${
                    isDark ? 'text-white/40' : 'text-slate-600'
                  }`}>
                    Confidence: {(preset.minConfidence * 100).toFixed(0)}%
                    {preset.search && ` • Search: "${preset.search}"`}
                  </p>
                </button>
                <motion.button
                  onClick={() => {
                    if (confirm(`Delete preset "${preset.name}"?`)) {
                      onDeletePreset(preset.id)
                    }
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-1 rounded transition-colors ${
                    isDark
                      ? 'text-white/30 hover:text-red-400'
                      : 'text-slate-600 hover:text-red-600'
                  }`}
                  title="Delete preset"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
