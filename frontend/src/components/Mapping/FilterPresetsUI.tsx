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
}

export default function FilterPresetsUI({
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
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
                ? 'bg-indigo-500/40 text-indigo-200 border border-indigo-500/60'
                : 'bg-white/[0.08] text-white/70 border border-white/[0.1] hover:bg-white/[0.12]'
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
              ? 'bg-emerald-500/40 text-emerald-200 border border-emerald-500/60'
              : 'bg-white/[0.08] text-white/70 border border-white/[0.1] hover:bg-white/[0.12]'
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
          className="flex gap-2 p-3 rounded-lg border border-white/[0.1] bg-white/[0.05]"
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
            className="flex-1 rounded border border-white/[0.1] bg-white/[0.08] px-2.5 py-1.5 text-xs text-white/80 placeholder-white/30 transition-colors focus:bg-white/[0.12] focus:outline-none"
          />
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded bg-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/50"
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
            className="rounded px-2 py-1.5 text-white/40 transition-colors hover:text-white/60"
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
                className="flex items-center justify-between rounded-lg border border-white/[0.1] bg-white/[0.05] p-2 hover:bg-white/[0.08]"
              >
                <button
                  onClick={() => onApplyPreset(preset)}
                  className="flex-1 text-left"
                >
                  <p className="text-xs font-medium text-white/70">
                    {preset.name}
                  </p>
                  <p className="text-[11px] text-white/40">
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
                  className="rounded p-1 text-white/30 transition-colors hover:text-red-400"
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
