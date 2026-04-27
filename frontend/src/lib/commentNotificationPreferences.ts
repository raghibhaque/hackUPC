export interface NotificationPreference {
  userId: string
  mentions: boolean
  replies: boolean
  reactions: boolean
  resolutions: boolean
  digestFrequency: 'none' | 'hourly' | 'daily' | 'weekly'
}

class CommentNotificationPreferencesManager {
  private preferences = new Map<string, NotificationPreference>()

  getOrCreatePreference(userId: string): NotificationPreference {
    if (!this.preferences.has(userId)) {
      this.preferences.set(userId, {
        userId,
        mentions: true,
        replies: true,
        reactions: false,
        resolutions: true,
        digestFrequency: 'daily'
      })
    }
    return this.preferences.get(userId)!
  }

  updatePreference(userId: string, updates: Partial<NotificationPreference>): NotificationPreference {
    const pref = this.getOrCreatePreference(userId)
    Object.assign(pref, updates)
    return pref
  }
}

export const commentNotificationPreferencesManager = new CommentNotificationPreferencesManager()
