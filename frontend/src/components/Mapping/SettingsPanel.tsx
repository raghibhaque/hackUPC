import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X } from 'lucide-react'
import { useState, useEffect } from 'react'

export interface UserPreferences {
  defaultSort: 'confidence' | 'name' | 'review'
  autoExpandConflicts: boolean
  displayDensity: 'compact' | 'normal' | 'spacious'
  accentColor: 'indigo' | 'violet' | 'blue' | 'emerald' | 'rose'
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSort: 'confidence',
  autoExpandConflicts: true,
  displayDensity: 'normal',
  accentColor: 'indigo',
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('schemahub:preferences')
    if (stored) {
      try {
        setPreferences(JSON.parse(stored))
      } catch (e) {
        console.warn('Failed to parse stored preferences:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    const newPrefs = { ...preferences, ...updates }
    setPreferences(newPrefs)
    localStorage.setItem('schemahub:preferences', JSON.stringify(newPrefs))
  }

  return { preferences, updatePreferences, isLoaded }
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: Props) {
  const { preferences, updatePreferences } = useUserPreferences()

  const accentColors: Array<UserPreferences['accentColor']> = ['indigo', 'violet', 'blue', 'emerald', 'rose']
  const densityOptions: Array<UserPreferences['displayDensity']> = ['compact', 'normal', 'spacious']
  const sortOptions: Array<UserPreferences['defaultSort']> = ['confidence', 'name', 'review']

  const accentColorBgMap: Record<UserPreferences['accentColor'], string> = {
    indigo: 'bg-indigo-500/20 border-indigo-500/30',
    violet: 'bg-violet-500/20 border-violet-500/30',
    blue: 'bg-blue-500/20 border-blue-500/30',
    emerald: 'bg-emerald-500/20 border-emerald-500/30',
    rose: 'bg-rose-500/20 border-rose-500/30',
  }

  const accentColorTextMap: Record<UserPreferences['accentColor'], string> = {
    indigo: 'text-indigo-300',
    violet: 'text-violet-300',
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="fixed right-0 top-0 z-50 h-full w-full max-w-md rounded-l-2xl border-l border-white/[0.1] bg-gradient-to-b from-white/[0.08] to-white/[0.04] shadow-2xl overflow-y-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-white/60" />
                <h2 className="text-lg font-semibold text-white">Settings</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-1 rounded text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="space-y-6">
              {/* Default Sort */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Default Sort Order
                </label>
                <div className="flex gap-2">
                  {sortOptions.map((option) => (
                    <motion.button
                      key={option}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updatePreferences({ defaultSort: option })}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        preferences.defaultSort === option
                          ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                          : 'bg-white/[0.05] border border-white/[0.1] text-white/60 hover:bg-white/[0.08]'
                      }`}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Auto-expand Conflicts */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center justify-between">
                  Auto-expand Conflicts
                  <motion.input
                    type="checkbox"
                    checked={preferences.autoExpandConflicts}
                    onChange={(e) => updatePreferences({ autoExpandConflicts: e.target.checked })}
                    className="h-4 w-4 rounded border border-white/15 bg-white/5 accent-indigo-500 cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                  />
                </label>
                <p className="text-xs text-white/40">
                  Automatically expand table rows when conflicts are detected
                </p>
              </motion.div>

              {/* Display Density */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Display Density
                </label>
                <div className="space-y-1.5">
                  {densityOptions.map((option) => (
                    <motion.button
                      key={option}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                      onClick={() => updatePreferences({ displayDensity: option })}
                      className={`w-full px-3 py-2 rounded-lg text-xs text-left font-medium transition-all ${
                        preferences.displayDensity === option
                          ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                          : 'bg-white/[0.05] border border-white/[0.1] text-white/60 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                        <span className="text-white/30 text-[10px]">
                          {option === 'compact' && '↕️ Minimal spacing'}
                          {option === 'normal' && '↕️ Balanced'}
                          {option === 'spacious' && '↕️ Extra breathing room'}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Accent Color */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Accent Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {accentColors.map((color) => (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updatePreferences({ accentColor: color })}
                      className={`h-10 rounded-lg border-2 transition-all ${
                        preferences.accentColor === color
                          ? `${accentColorBgMap[color]} border-opacity-100`
                          : 'border-white/[0.1] bg-white/[0.05] border-opacity-50'
                      }`}
                      title={color}
                    >
                      {preferences.accentColor === color && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`text-lg ${accentColorTextMap[color]}`}
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Reset to Defaults */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="pt-4 border-t border-white/[0.08]"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    localStorage.removeItem('schemahub:preferences')
                    location.reload()
                  }}
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white/80 border border-white/[0.1] hover:border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.08] transition-all"
                >
                  Reset to Defaults
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
