import { useState, useEffect } from 'react'

export interface FilterPreset {
  id: string
  name: string
  search: string
  minConfidence: number
  type: 'builtin' | 'custom'
}

const BUILTIN_PRESETS: FilterPreset[] = [
  {
    id: 'high-confidence',
    name: 'High confidence',
    search: '',
    minConfidence: 0.8,
    type: 'builtin',
  },
  {
    id: 'low-confidence',
    name: 'Low confidence',
    search: '',
    minConfidence: 0.0,
    type: 'builtin',
  },
  {
    id: 'unreviewed',
    name: 'Unreviewed',
    search: '',
    minConfidence: 0.0,
    type: 'builtin',
  },
]

const PRESETS_STORAGE_KEY = 'schemasync:filter-presets'

export function useFilterPresets() {
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
    if (stored) {
      try {
        const presets = JSON.parse(stored) as FilterPreset[]
        setCustomPresets(presets)
      } catch (e) {
        console.warn('Failed to parse stored presets:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  const allPresets = [...BUILTIN_PRESETS, ...customPresets]

  const savePreset = (name: string, search: string, minConfidence: number) => {
    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      search,
      minConfidence,
      type: 'custom',
    }

    setCustomPresets((prev) => {
      const updated = [...prev, newPreset]
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })

    return newPreset
  }

  const deletePreset = (id: string) => {
    setCustomPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  return {
    allPresets,
    customPresets,
    isLoaded,
    savePreset,
    deletePreset,
  }
}
