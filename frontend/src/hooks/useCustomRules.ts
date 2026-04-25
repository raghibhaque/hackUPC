import { useState, useEffect } from 'react'

export type RuleType = 'remove_prefix' | 'remove_suffix' | 'replace' | 'synonym' | 'normalize_case'

export interface CustomRule {
  id: string
  type: RuleType
  name: string
  enabled: boolean
  config: {
    prefix?: string
    suffix?: string
    find?: string
    replace?: string
    synonym?: string
    caseType?: 'lower' | 'upper' | 'none'
  }
}

const RULES_STORAGE_KEY = 'schemasync:custom-rules'

export function useCustomRules() {
  const [rules, setRules] = useState<CustomRule[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(RULES_STORAGE_KEY)
    if (stored) {
      try {
        const parsedRules = JSON.parse(stored) as CustomRule[]
        setRules(parsedRules)
      } catch (e) {
        console.warn('Failed to parse stored rules:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  const saveRule = (rule: Omit<CustomRule, 'id'>) => {
    const newRule: CustomRule = {
      ...rule,
      id: `rule-${Date.now()}`,
    }

    setRules((prev) => {
      const updated = [...prev, newRule]
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })

    return newRule
  }

  const updateRule = (id: string, updates: Partial<CustomRule>) => {
    setRules((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      )
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const deleteRule = (id: string) => {
    setRules((prev) => {
      const updated = prev.filter((r) => r.id !== id)
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const applyRule = (columnName: string, rule: CustomRule): string => {
    if (!rule.enabled) return columnName

    switch (rule.type) {
      case 'remove_prefix':
        if (rule.config.prefix && columnName.startsWith(rule.config.prefix)) {
          return columnName.slice(rule.config.prefix.length)
        }
        return columnName

      case 'remove_suffix':
        if (rule.config.suffix && columnName.endsWith(rule.config.suffix)) {
          return columnName.slice(0, -rule.config.suffix.length)
        }
        return columnName

      case 'replace':
        if (rule.config.find) {
          return columnName.replace(new RegExp(rule.config.find, 'g'), rule.config.replace || '')
        }
        return columnName

      case 'synonym':
        if (columnName.toLowerCase() === (rule.config.synonym || '').toLowerCase()) {
          return rule.config.replace || columnName
        }
        return columnName

      case 'normalize_case':
        switch (rule.config.caseType) {
          case 'lower':
            return columnName.toLowerCase()
          case 'upper':
            return columnName.toUpperCase()
          default:
            return columnName
        }

      default:
        return columnName
    }
  }

  const applyAllRules = (columnName: string): string => {
    return rules.reduce((name, rule) => applyRule(name, rule), columnName)
  }

  return {
    rules,
    isLoaded,
    saveRule,
    updateRule,
    deleteRule,
    applyRule,
    applyAllRules,
  }
}
