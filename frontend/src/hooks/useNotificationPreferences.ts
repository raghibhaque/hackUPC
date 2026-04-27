import { useCallback } from 'react'
import { commentNotificationPreferencesManager } from '../lib/commentNotificationPreferences'

export function useNotificationPreferences(userId: string) {
  const getPreferences = useCallback(() => commentNotificationPreferencesManager.getOrCreatePreference(userId), [userId])
  const update = useCallback((updates: any) => commentNotificationPreferencesManager.updatePreference(userId, updates), [userId])
  return {getPreferences, update}
}
