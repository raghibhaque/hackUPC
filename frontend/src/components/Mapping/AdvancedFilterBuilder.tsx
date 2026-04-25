import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Filter } from 'lucide-react'
import { useState } from 'react'

export interface AdvancedFilterCriteria {
  id: string
  type: 'status' | 'confidence' | 'conflicts' | 'type_mismatch' | 'reviewed'
  operator: 'equals' | 'greater' | 'less' | 'has' | 'not_has'
  value: string | number | boolean
  logic: 'AND' | 'OR'
}

interface Props {
  filters: AdvancedFilterCriteria[]
  onFiltersChange: (filters: AdvancedFilterCriteria[]) => void
  onApply: () => void
}

export default function AdvancedFilterBuilder({ filters, onFiltersChange, onApply }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const addFilter = () => {
    const newFilter: AdvancedFilterCriteria = {
      id: `filter-${Date.now()}`,
      type: 'status',
      operator: 'equals',
      value: 'reviewed',
      logic: filters.length === 0 ? 'AND' : 'AND',
    }
    onFiltersChange([...filters, newFilter])
  }

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id))
  }

  const updateFilter = (id: string, updates: Partial<AdvancedFilterCriteria>) => {
    onFiltersChange(
      filters.map(f => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  const getOperatorOptions = (type: string) => {
    switch (type) {
      case 'confidence':
        return ['greater', 'less', 'equals']
      case 'status':
        return ['equals']
      case 'conflicts':
        return ['has', 'not_has']
      case 'type_mismatch':
        return ['has', 'not_has']
      case 'reviewed':
        return ['equals']
      default:
        return []
    }
  }

  const getValueOptions = (type: string) => {
    switch (type) {
      case 'status':
        return ['reviewed', 'unreviewed', 'approved', 'rejected']
      case 'reviewed':
        return ['true', 'false']
      case 'conflicts':
      case 'type_mismatch':
        return ['true', 'false']
      default:
        return []
    }
  }

  return (
    <div className="space-y-3">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Advanced Filters</span>
          {filters.length > 0 && <span className="text-xs bg-indigo-500/30 px-2 py-0.5 rounded">{filters.length}</span>}
        </div>
        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-white/[0.1] bg-white/[0.03] p-4 space-y-3"
          >
            {filters.map((filter, index) => (
              <motion.div
                key={filter.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex items-end gap-2"
              >
                {/* Logic Operator */}
                {index > 0 && (
                  <select
                    value={filter.logic}
                    onChange={(e) => updateFilter(filter.id, { logic: e.target.value as 'AND' | 'OR' })}
                    className="px-2 py-2 rounded bg-white/[0.05] border border-white/[0.1] text-white/70 text-xs font-medium"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                )}

                {/* Filter Type */}
                <select
                  value={filter.type}
                  onChange={(e) => updateFilter(filter.id, { type: e.target.value as any })}
                  className="px-2 py-2 rounded bg-white/[0.05] border border-white/[0.1] text-white/70 text-xs font-medium flex-1"
                >
                  <option value="status">Status</option>
                  <option value="confidence">Confidence</option>
                  <option value="conflicts">Conflicts</option>
                  <option value="type_mismatch">Type Mismatch</option>
                  <option value="reviewed">Reviewed</option>
                </select>

                {/* Operator */}
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                  className="px-2 py-2 rounded bg-white/[0.05] border border-white/[0.1] text-white/70 text-xs font-medium"
                >
                  {getOperatorOptions(filter.type).map(op => (
                    <option key={op} value={op}>
                      {op === 'equals' && 'Is'}
                      {op === 'greater' && '>'}
                      {op === 'less' && '<'}
                      {op === 'has' && 'Has'}
                      {op === 'not_has' && 'No'}
                    </option>
                  ))}
                </select>

                {/* Value */}
                {filter.type === 'confidence' ? (
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={typeof filter.value === 'number' ? filter.value : 0}
                    onChange={(e) => updateFilter(filter.id, { value: parseFloat(e.target.value) })}
                    className="px-2 py-2 rounded bg-white/[0.05] border border-white/[0.1] text-white/70 text-xs font-medium w-20"
                  />
                ) : (
                  <select
                    value={String(filter.value)}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    className="px-2 py-2 rounded bg-white/[0.05] border border-white/[0.1] text-white/70 text-xs font-medium"
                  >
                    {getValueOptions(filter.type).map(val => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                )}

                {/* Remove Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => removeFilter(filter.id)}
                  className="p-2 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </motion.div>
            ))}

            {/* Add Filter Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addFilter}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/[0.1] hover:bg-white/[0.05] text-white/60 hover:text-white/80 text-xs font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Filter
            </motion.button>

            {/* Apply Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onApply()
                setIsExpanded(false)
              }}
              className="w-full px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-medium text-xs transition-colors"
            >
              Apply Filters
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
