import { useEffect } from 'react'

export function useKeyboardShortcuts(actions: {
  onSearchFocus?: () => void
  onEscape?: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement

      if (isMeta && e.key === 'k' && !isInput) {
        e.preventDefault()
        actions.onSearchFocus?.()
      }

      if (e.key === 'Escape' && isInput) {
        actions.onEscape?.()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [actions])
}
