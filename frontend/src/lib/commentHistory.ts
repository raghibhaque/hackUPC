/**
 * Comment version history and audit trail
 */

export interface CommentEdit {
  editId: string
  commentId: string
  previousContent: string
  newContent: string
  editedBy: string
  editedAt: number
  reason?: string
}

export interface CommentAuditLog {
  logId: string
  commentId: string
  action: 'created' | 'edited' | 'deleted' | 'resolved' | 'reaction_added' | 'reaction_removed'
  actor: string
  timestamp: number
  metadata?: Record<string, any>
}

class CommentHistoryManager {
  private editHistory: Map<string, CommentEdit[]> = new Map()
  private auditLog: CommentAuditLog[] = []
  private nextEditId = 0
  private nextLogId = 0

  recordEdit(commentId: string, previousContent: string, newContent: string, editedBy: string, reason?: string): CommentEdit {
    const edit: CommentEdit = {
      editId: `edit-${++this.nextEditId}`,
      commentId,
      previousContent,
      newContent,
      editedBy,
      editedAt: Date.now(),
      reason
    }

    if (!this.editHistory.has(commentId)) {
      this.editHistory.set(commentId, [])
    }
    this.editHistory.get(commentId)!.push(edit)

    this.recordAuditLog(commentId, 'edited', editedBy, {reason})

    return edit
  }

  recordAuditLog(commentId: string, action: CommentAuditLog['action'], actor: string, metadata?: Record<string, any>): CommentAuditLog {
    const log: CommentAuditLog = {
      logId: `log-${++this.nextLogId}`,
      commentId,
      action,
      actor,
      timestamp: Date.now(),
      metadata
    }

    this.auditLog.push(log)
    return log
  }

  getEditHistory(commentId: string): CommentEdit[] {
    return (this.editHistory.get(commentId) || []).sort((a, b) => b.editedAt - a.editedAt)
  }

  getAuditLog(commentId?: string): CommentAuditLog[] {
    if (commentId) {
      return this.auditLog.filter(log => log.commentId === commentId)
    }
    return [...this.auditLog].sort((a, b) => b.timestamp - a.timestamp)
  }

  getEditCount(commentId: string): number {
    return (this.editHistory.get(commentId) || []).length
  }

  hasBeenEdited(commentId: string): boolean {
    return this.getEditCount(commentId) > 0
  }

  getLastEdit(commentId: string): CommentEdit | null {
    const edits = this.editHistory.get(commentId) || []
    return edits.length > 0 ? edits[edits.length - 1] : null
  }

  getEditDiff(commentId: string, editId: string): {previousContent: string, newContent: string, changes: string[]} | null {
    const edit = this.editHistory.get(commentId)?.find(e => e.editId === editId)
    if (!edit) return null

    const changes = this.calculateDiff(edit.previousContent, edit.newContent)

    return {
      previousContent: edit.previousContent,
      newContent: edit.newContent,
      changes
    }
  }

  private calculateDiff(oldText: string, newText: string): string[] {
    const changes: string[] = []

    if (oldText.length !== newText.length) {
      changes.push(`Length changed from ${oldText.length} to ${newText.length} characters`)
    }

    const oldLines = oldText.split('\n')
    const newLines = newText.split('\n')

    if (oldLines.length !== newLines.length) {
      changes.push(`Lines changed from ${oldLines.length} to ${newLines.length}`)
    }

    const oldWords = oldText.split(/\s+/)
    const newWords = newText.split(/\s+/)

    if (oldWords.length !== newWords.length) {
      changes.push(`Words changed from ${oldWords.length} to ${newWords.length}`)
    }

    return changes
  }

  getActionTimeline(commentId: string): CommentAuditLog[] {
    return this.auditLog
      .filter(log => log.commentId === commentId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  getCommentAuthorHistory(commentId: string): {author: string, firstAppearance: number}[] {
    const logs = this.getAuditLog(commentId)
    const authorMap = new Map<string, number>()

    logs.forEach(log => {
      if (!authorMap.has(log.actor)) {
        authorMap.set(log.actor, log.timestamp)
      }
    })

    return Array.from(authorMap.entries())
      .map(([author, timestamp]) => ({author, firstAppearance: timestamp}))
      .sort((a, b) => a.firstAppearance - b.firstAppearance)
  }

  getRecentActivity(limit = 20): CommentAuditLog[] {
    return [...this.auditLog]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  getActivityByUser(user: string): CommentAuditLog[] {
    return this.auditLog
      .filter(log => log.actor === user)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  getTotalEditCount(): number {
    return Array.from(this.editHistory.values()).reduce((sum, edits) => sum + edits.length, 0)
  }

  getCommentsByEditCount(limit = 10): Array<{commentId: string, editCount: number}> {
    return Array.from(this.editHistory.entries())
      .map(([commentId, edits]) => ({commentId, editCount: edits.length}))
      .sort((a, b) => b.editCount - a.editCount)
      .slice(0, limit)
  }
}

export const commentHistoryManager = new CommentHistoryManager()
