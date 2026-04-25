import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Filter, Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAdvancedFilters, getFilterSummary, FilterProfile, FilterCondition } from '../../hooks/useAdvancedFilters'

interface Props {
  onFilterChange?: (profile: FilterProfile | null) => void
  onExport?: (profile: FilterProfile) => void
}

export default function FilterBuilder({ onFilterChange, onExport }: Props) {
  const { profiles, activeProfile, setActiveProfile, createProfile, updateProfile, deleteProfile } = useAdvancedFilters()
  const [showBuilder, setShowBuilder] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [conditions, setConditions] = useState<FilterCondition[]>([])

  const handleAddCondition = () => {
    const id = `cond_${Date.now()}`
    const newCondition: FilterCondition = {
      id,
      field: 'status',
      operator: 'equals',
      value: 'reviewed',
    }
    setConditions([...conditions, newCondition])
  }

  const handleSaveProfile = () => {
    if (!newProfileName.trim() || conditions.length === 0) return

    createProfile({
      name: newProfileName,
      conditions,
      logic: 'AND',
    })

    setNewProfileName('')
    setConditions([])
    setShowBuilder(false)
  }

  const handleSelectProfile = (profile: FilterProfile) => {
    setActiveProfile(profile)
    onFilterChange?.(profile)
  }

  const quickFilters = profiles.filter(p => p.isQuick)
  const customFilters = profiles.filter(p => !p.isQuick)

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Quick Filters */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Quick Filters</p>
        <div className="grid grid-cols-2 gap-2">
          {quickFilters.map((filter, i) => (
            <motion.button
              key={filter.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelectProfile(filter)}
              className={cn(
                'text-xs font-semibold py-2 px-3 rounded-lg border transition-all',
                activeProfile?.id === filter.id
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'border-white/[0.08] text-white/60 hover:bg-white/[0.05]'
              )}
              title={filter.description}
            >
              {filter.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Filters */}
      {customFilters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Custom Filters</p>
          <div className="space-y-2">
            {customFilters.map((filter, i) => (
              <motion.div
                key={filter.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => handleSelectProfile(filter)}
                    className={cn(
                      'flex-1 cursor-pointer transition-opacity hover:opacity-80',
                      activeProfile?.id === filter.id && 'opacity-100'
                    )}
                  >
                    <h4 className="font-semibold text-sm text-white/90">{filter.name}</h4>
                    <p className="text-[10px] text-white/50 mt-1">
                      {getFilterSummary(filter.conditions, filter.logic)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onExport?.(filter)}
                      className="p-1 hover:bg-white/[0.1] rounded transition-colors text-white/40 hover:text-white/60"
                      title="Export"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteProfile(filter.id)}
                      className="p-1 hover:bg-white/[0.1] rounded transition-colors text-white/40 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Create Filter Button */}
      <button
        onClick={() => setShowBuilder(!showBuilder)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create Custom Filter
      </button>

      {/* Filter Builder */}
      <AnimatePresence>
        {showBuilder && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-4 space-y-3"
          >
            {/* Name Input */}
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1">Filter Name</label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g., High Confidence Unreviewed"
                className="w-full bg-black/30 border border-white/[0.08] rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/[0.15]"
              />
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/70">Conditions</label>
                <button
                  onClick={handleAddCondition}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>

              {conditions.length === 0 ? (
                <p className="text-xs text-white/40 py-2">No conditions. Click "Add" to get started.</p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((cond, i) => (
                    <motion.div
                      key={cond.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/20 border border-white/[0.08] rounded p-2 flex items-center gap-2"
                    >
                      <select
                        value={cond.field}
                        onChange={(e) => {
                          const updated = conditions.map((c, idx) =>
                            idx === i ? { ...c, field: e.target.value as any } : c
                          )
                          setConditions(updated)
                        }}
                        className="flex-1 bg-transparent text-xs text-white/80 border-none outline-none"
                      >
                        <option value="status">Status</option>
                        <option value="confidence">Confidence</option>
                        <option value="conflicts">Conflicts</option>
                        <option value="table_name">Table Name</option>
                        <option value="column_count">Column Count</option>
                        <option value="type_mismatch">Type Mismatch</option>
                      </select>

                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const updated = conditions.map((c, idx) =>
                            idx === i ? { ...c, operator: e.target.value as any } : c
                          )
                          setConditions(updated)
                        }}
                        className="bg-transparent text-xs text-white/80 border-none outline-none"
                      >
                        <option value="equals">=</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">&gt;</option>
                        <option value="less_than">&lt;</option>
                      </select>

                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => {
                          const updated = conditions.map((c, idx) =>
                            idx === i ? { ...c, value: e.target.value } : c
                          )
                          setConditions(updated)
                        }}
                        placeholder="Value"
                        className="w-20 bg-transparent text-xs text-white/80 border-none outline-none placeholder-white/20"
                      />

                      <button
                        onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))}
                        className="p-1 hover:bg-white/[0.1] rounded text-white/40 hover:text-rose-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowBuilder(false)
                  setConditions([])
                  setNewProfileName('')
                }}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded border border-white/[0.08] text-white/70 hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!newProfileName.trim() || conditions.length === 0}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                Save Filter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Info */}
      {activeProfile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-start gap-2">
            <Filter className="h-4 w-4 text-indigo-300 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-300">Active Filter: {activeProfile.name}</p>
              <p className="text-[10px] text-indigo-200/70 mt-1 break-words">
                {getFilterSummary(activeProfile.conditions, activeProfile.logic)}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveProfile(null)
              onFilterChange?.(null)
            }}
            className="text-xs text-indigo-200 hover:text-indigo-100 font-semibold"
          >
            Clear Filter
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
