import { useState, useEffect, useCallback, useMemo } from 'react'

export interface MappingTemplate {
  id: string
  name: string
  description?: string
  version?: string
  category?: string
  tags?: string[]
  createdAt: number
  updatedAt?: number
  reviewedIndices?: number[]
  expandedIndices?: number[]
  sourceSchemaHash: string
  targetSchemaHash: string
  configurations?: {
    rules?: Record<string, any>
    resolutions?: Record<string, any>
    notes?: Record<string, string>
    settings?: Record<string, any>
  }
  metadata?: {
    usageCount: number
    successRate?: number
    author?: string
  }
  isSmartTemplate?: boolean
}

export interface WorkspaceSnapshot {
  id: string
  name: string
  timestamp: number
  templates: MappingTemplate[]
  filters?: any
  settings?: Record<string, any>
}

const TEMPLATES_STORAGE_KEY = 'schemahub:templates'
const SNAPSHOT_KEY = 'schemahub:snapshots'

export function useTemplates(schemaHash: string) {
  const [templates, setTemplates] = useState<MappingTemplate[]>([])
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load templates
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (stored) {
      try {
        const all = JSON.parse(stored) as MappingTemplate[]
        const matching = all.filter(t => t.sourceSchemaHash === schemaHash)
        setTemplates(matching)
      } catch (e) {
        console.warn('Failed to parse stored templates:', e)
      }
    }

    // Load snapshots
    const snapshotStored = localStorage.getItem(SNAPSHOT_KEY)
    if (snapshotStored) {
      try {
        const snaps = JSON.parse(snapshotStored) as WorkspaceSnapshot[]
        setSnapshots(snaps)
      } catch (e) {
        console.warn('Failed to parse stored snapshots:', e)
      }
    }

    setIsLoaded(true)
  }, [schemaHash])

  const saveTemplates = useCallback((newTemplates: MappingTemplate[]) => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
      const allTemplates = stored ? JSON.parse(stored) as MappingTemplate[] : []
      const updated = allTemplates.filter(t => t.sourceSchemaHash !== schemaHash)
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify([...updated, ...newTemplates]))
      setTemplates(newTemplates)
    } catch (error) {
      console.warn('Failed to save templates:', error)
    }
  }, [schemaHash])

  const saveTemplate = useCallback((
    name: string,
    reviewedIndices: number[],
    expandedIndices: number[],
    description?: string,
    category?: string,
    tags?: string[]
  ) => {
    if (!name.trim()) {
      throw new Error('Template name cannot be empty')
    }

    const newTemplate: MappingTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      description,
      category,
      tags,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reviewedIndices,
      expandedIndices,
      sourceSchemaHash: schemaHash,
      targetSchemaHash: schemaHash,
      metadata: {
        usageCount: 0,
      },
    }

    const updated = [...templates, newTemplate]
    saveTemplates(updated)
    return newTemplate
  }, [templates, saveTemplates])

  const deleteTemplate = useCallback((templateId: string) => {
    const updated = templates.filter(t => t.id !== templateId)
    saveTemplates(updated)
  }, [templates, saveTemplates])

  const updateTemplate = useCallback((templateId: string, updates: Partial<MappingTemplate>) => {
    const updated = templates.map(t =>
      t.id === templateId
        ? { ...t, ...updates, updatedAt: Date.now() }
        : t
    )
    saveTemplates(updated)
  }, [templates, saveTemplates])

  const cloneTemplate = useCallback((templateId: string, newName: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return null

    const cloned: MappingTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: newName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        usageCount: 0,
      },
    }

    const updated = [...templates, cloned]
    saveTemplates(updated)
    return cloned
  }, [templates, saveTemplates])

  const getTemplate = useCallback((templateId: string) => {
    return templates.find(t => t.id === templateId)
  }, [templates])

  const recordTemplateUsage = useCallback((templateId: string, success: boolean) => {
    const updated = templates.map(t => {
      if (t.id === templateId && t.metadata) {
        return {
          ...t,
          metadata: {
            ...t.metadata,
            usageCount: t.metadata.usageCount + 1,
            successRate: t.metadata.successRate
              ? (t.metadata.successRate + (success ? 1 : 0)) / (t.metadata.usageCount + 1)
              : success ? 1 : 0,
          },
        }
      }
      return t
    })
    saveTemplates(updated)
  }, [templates, saveTemplates])

  // Snapshot operations
  const createSnapshot = useCallback((name: string) => {
    const snapshot: WorkspaceSnapshot = {
      id: `snapshot_${Date.now()}`,
      name,
      timestamp: Date.now(),
      templates: templates,
      settings: {},
    }
    const updated = [...snapshots, snapshot]
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(updated))
      setSnapshots(updated)
    } catch (error) {
      console.warn('Failed to save snapshot:', error)
    }
  }, [templates, snapshots])

  const restoreSnapshot = useCallback((snapshotId: string) => {
    const snapshot = snapshots.find(s => s.id === snapshotId)
    if (!snapshot) return false

    saveTemplates(snapshot.templates.filter(t => t.sourceSchemaHash === schemaHash))
    return true
  }, [snapshots, saveTemplates, schemaHash])

  const deleteSnapshot = useCallback((snapshotId: string) => {
    const updated = snapshots.filter(s => s.id !== snapshotId)
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(updated))
      setSnapshots(updated)
    } catch (error) {
      console.warn('Failed to delete snapshot:', error)
    }
  }, [snapshots])

  const searchTemplates = useCallback((query: string) => {
    const lower = query.toLowerCase()
    return templates.filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description?.toLowerCase().includes(lower) ||
      t.tags?.some(tag => tag.toLowerCase().includes(lower))
    )
  }, [templates])

  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter(t => t.category === category)
  }, [templates])

  const getCategories = useMemo(() => {
    const cats = new Set<string>()
    templates.forEach(t => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [templates])

  const getMostUsedTemplates = useCallback((limit = 5) => {
    return [...templates]
      .sort((a, b) => (b.metadata?.usageCount || 0) - (a.metadata?.usageCount || 0))
      .slice(0, limit)
  }, [templates])

  const getHighestRatedTemplates = useCallback((limit = 5) => {
    return [...templates]
      .filter(t => t.metadata?.successRate !== undefined)
      .sort((a, b) => (b.metadata?.successRate || 0) - (a.metadata?.successRate || 0))
      .slice(0, limit)
  }, [templates])

  return {
    templates,
    snapshots,
    isLoaded,
    saveTemplate,
    deleteTemplate,
    updateTemplate,
    cloneTemplate,
    getTemplate,
    recordTemplateUsage,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    searchTemplates,
    getTemplatesByCategory,
    getCategories,
    getMostUsedTemplates,
    getHighestRatedTemplates,
  }
}

export function exportTemplate(template: MappingTemplate): string {
  return JSON.stringify(template, null, 2)
}

export function importTemplate(json: string): MappingTemplate | null {
  try {
    const data = JSON.parse(json)
    if (!data.name || !data.sourceSchemaHash) {
      throw new Error('Invalid template structure')
    }
    return {
      ...data,
      id: `imported_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        usageCount: 0,
      },
    }
  } catch (error) {
    console.error('Failed to import template:', error)
    return null
  }
}
