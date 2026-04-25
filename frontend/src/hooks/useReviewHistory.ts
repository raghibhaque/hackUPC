import { useState, useCallback } from 'react'
import type { ReviewDecision } from '../types/review'

interface HistoryEntry {
  action: 'approve' | 'reject' | 'modify' | 'reset'
  mappingId: string
  decision: ReviewDecision | null
  timestamp: number
}

export function useReviewHistory(maxSize: number = 50) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  // Add entry to history (invalidates redo stack if not at the end)
  const addEntry = useCallback((entry: HistoryEntry) => {
    setHistory(prev => {
      // If we're not at the end, remove everything after current index
      const newHistory = prev.slice(0, currentIndex + 1)
      // Add new entry
      newHistory.push(entry)
      // Keep size under limit
      if (newHistory.length > maxSize) {
        newHistory.shift()
      } else {
        setCurrentIndex(prev => prev + 1)
      }
      return newHistory
    })
  }, [currentIndex, maxSize])

  // Check if undo is available
  const canUndo = currentIndex > -1

  // Check if redo is available
  const canRedo = currentIndex < history.length - 1

  // Get current state (for checking what to redo)
  const getCurrent = useCallback((): HistoryEntry | null => {
    if (currentIndex === -1) return null
    return history[currentIndex] || null
  }, [history, currentIndex])

  // Get previous state (for undo)
  const getPrevious = useCallback((): HistoryEntry | null => {
    if (!canUndo) return null
    return history[currentIndex - 1] || null
  }, [history, currentIndex, canUndo])

  // Get next state (for redo)
  const getNext = useCallback((): HistoryEntry | null => {
    if (!canRedo) return null
    return history[currentIndex + 1] || null
  }, [history, currentIndex, canRedo])

  // Undo to previous state
  const undo = useCallback((): HistoryEntry | null => {
    if (!canUndo) return null
    const prevIndex = currentIndex - 1
    setCurrentIndex(prevIndex)
    return history[prevIndex] || null
  }, [history, currentIndex, canUndo])

  // Redo to next state
  const redo = useCallback((): HistoryEntry | null => {
    if (!canRedo) return null
    const nextIndex = currentIndex + 1
    setCurrentIndex(nextIndex)
    return history[nextIndex] || null
  }, [history, currentIndex, canRedo])

  // Clear all history
  const clear = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  // Get full history for debugging
  const getHistory = useCallback(() => history, [history])

  return {
    history,
    currentIndex,
    addEntry,
    canUndo,
    canRedo,
    undo,
    redo,
    getCurrent,
    getPrevious,
    getNext,
    clear,
    getHistory,
  }
}
