import { useState, useEffect } from 'react'

export interface MappingTemplate {
  id: string
  name: string
  createdAt: number
  reviewedIndices: number[]
  expandedIndices: number[]
  sourceSchemaHash: string
  targetSchemaHash: string
}

const TEMPLATES_STORAGE_KEY = 'schemasync:templates'

export function useTemplates(schemaHash: string) {
  const [templates, setTemplates] = useState<MappingTemplate[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (stored) {
      try {
        const all = JSON.parse(stored) as MappingTemplate[]
        // Filter to only templates for current schema
        const matching = all.filter(t => t.sourceSchemaHash === schemaHash)
        setTemplates(matching)
      } catch (e) {
        console.warn('Failed to parse stored templates:', e)
      }
    }
    setIsLoaded(true)
  }, [schemaHash])

  const saveTemplate = (
    name: string,
    reviewedIndices: number[],
    expandedIndices: number[]
  ) => {
    if (!name.trim()) {
      throw new Error('Template name cannot be empty')
    }

    const newTemplate: MappingTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      createdAt: Date.now(),
      reviewedIndices,
      expandedIndices,
      sourceSchemaHash: schemaHash,
      targetSchemaHash: schemaHash,
    }

    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    const allTemplates = stored ? (JSON.parse(stored) as MappingTemplate[]) : []

    allTemplates.push(newTemplate)
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(allTemplates))

    setTemplates([...templates, newTemplate])
    return newTemplate
  }

  const deleteTemplate = (templateId: string) => {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (stored) {
      const allTemplates = JSON.parse(stored) as MappingTemplate[]
      const updated = allTemplates.filter(t => t.id !== templateId)
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated))
    }

    setTemplates(templates.filter(t => t.id !== templateId))
  }

  const getTemplate = (templateId: string) => {
    return templates.find(t => t.id === templateId)
  }

  return {
    templates,
    isLoaded,
    saveTemplate,
    deleteTemplate,
    getTemplate,
  }
}
