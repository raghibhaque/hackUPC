import { useCallback, useEffect, useMemo, useState } from 'react'

export type FilterOperator = 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_in' | 'range'
export type FilterLogic = 'AND' | 'OR'

export interface FilterCondition {
  id: string
  field: 'status' | 'confidence' | 'conflicts' | 'table_name' | 'column_count' | 'type_mismatch'
  operator: FilterOperator
  value: any
  logic?: FilterLogic
}

export interface FilterProfile {
  id: string
  name: string
  description?: string
  conditions: FilterCondition[]
  logic: FilterLogic
  isQuick?: boolean
  createdAt: number
  updatedAt: number
}

const QUICK_FILTERS: FilterProfile[] = [
  {
    id: 'high_confidence',
    name: 'High Confidence',
    description: 'Show mappings with >85% confidence',
    conditions: [
      {
        id: '1',
        field: 'confidence',
        operator: 'greater_than',
        value: 0.85,
      },
    ],
    logic: 'AND',
    isQuick: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'conflicts_only',
    name: 'Conflicts Only',
    description: 'Show only mappings with conflicts',
    conditions: [
      {
        id: '1',
        field: 'conflicts',
        operator: 'greater_than',
        value: 0,
      },
    ],
    logic: 'AND',
    isQuick: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'needs_review',
    name: 'Needs Review',
    description: 'Show unreviewed low-confidence mappings',
    conditions: [
      {
        id: '1',
        field: 'confidence',
        operator: 'less_than',
        value: 0.7,
      },
      {
        id: '2',
        field: 'status',
        operator: 'equals',
        value: 'unreviewed',
        logic: 'AND',
      },
    ],
    logic: 'AND',
    isQuick: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'type_issues',
    name: 'Type Mismatches',
    description: 'Show mappings with type mismatches',
    conditions: [
      {
        id: '1',
        field: 'type_mismatch',
        operator: 'equals',
        value: true,
      },
    ],
    logic: 'AND',
    isQuick: true,
    createdAt: 0,
    updatedAt: 0,
  },
]

const STORAGE_KEY = 'schemahub:filterprofiles'

export function useAdvancedFilters() {
  const [profiles, setProfiles] = useState<FilterProfile[]>(QUICK_FILTERS)
  const [activeProfile, setActiveProfile] = useState<FilterProfile | null>(null)

  // Load profiles from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as FilterProfile[]
        setProfiles([...QUICK_FILTERS, ...parsed])
      }
    } catch (error) {
      console.warn('Failed to load filter profiles:', error)
    }
  }, [])

  // Save custom profiles to localStorage
  const saveProfiles = useCallback((newProfiles: FilterProfile[]) => {
    try {
      const custom = newProfiles.filter(p => !p.isQuick)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
      setProfiles([...QUICK_FILTERS, ...custom])
    } catch (error) {
      console.warn('Failed to save filter profiles:', error)
    }
  }, [])

  const createProfile = useCallback((profile: Omit<FilterProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProfile: FilterProfile = {
      ...profile,
      id: `filter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    saveProfiles([...profiles.filter(p => !p.isQuick), newProfile])
  }, [profiles, saveProfiles])

  const updateProfile = useCallback((id: string, updates: Partial<FilterProfile>) => {
    const updated = profiles.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    )
    saveProfiles(updated.filter(p => !p.isQuick))
  }, [profiles, saveProfiles])

  const deleteProfile = useCallback((id: string) => {
    const updated = profiles.filter(p => p.id !== id)
    saveProfiles(updated.filter(p => !p.isQuick))
  }, [profiles, saveProfiles])

  return {
    profiles,
    activeProfile,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  }
}

export function evaluateFilters(
  data: Record<string, any>,
  conditions: FilterCondition[],
  logic: FilterLogic = 'AND'
): boolean {
  if (conditions.length === 0) return true

  const results = conditions.map(condition => evaluateCondition(data, condition))

  if (logic === 'AND') {
    return results.every(r => r)
  } else {
    return results.some(r => r)
  }
}

function evaluateCondition(data: Record<string, any>, condition: FilterCondition): boolean {
  const value = data[condition.field]

  switch (condition.operator) {
    case 'equals':
      return value === condition.value
    case 'contains':
      return typeof value === 'string' && value.includes(condition.value)
    case 'greater_than':
      return value > condition.value
    case 'less_than':
      return value < condition.value
    case 'is_in':
      return Array.isArray(condition.value) && condition.value.includes(value)
    case 'range':
      return value >= condition.value.min && value <= condition.value.max
    default:
      return true
  }
}

export function getFilterSummary(conditions: FilterCondition[], logic: FilterLogic): string {
  if (conditions.length === 0) return 'No filters'

  const parts = conditions.map(c => {
    const field = c.field.replace(/_/g, ' ')
    switch (c.operator) {
      case 'equals':
        return `${field} = ${c.value}`
      case 'contains':
        return `${field} contains "${c.value}"`
      case 'greater_than':
        return `${field} > ${c.value}`
      case 'less_than':
        return `${field} < ${c.value}`
      case 'is_in':
        return `${field} in [${c.value.join(', ')}]`
      case 'range':
        return `${field} between ${c.value.min} - ${c.value.max}`
      default:
        return field
    }
  })

  const logicWord = logic === 'AND' ? ' AND ' : ' OR '
  return parts.join(logicWord)
}
