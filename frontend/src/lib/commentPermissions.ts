/**
 * Comment access control and permissions system
 */

export type PermissionLevel = 'owner' | 'editor' | 'viewer' | 'none'

export interface CommentPermission {
  commentId: string
  userId: string
  permissionLevel: PermissionLevel
  grantedAt: number
  grantedBy: string
}

class CommentPermissionsManager {
  private permissions: Map<string, Map<string, CommentPermission>> = new Map()
  private commentOwners: Map<string, string> = new Map()

  setCommentOwner(commentId: string, userId: string): void {
    this.commentOwners.set(commentId, userId)
    this.grantPermission(commentId, userId, 'owner', userId)
  }

  getCommentOwner(commentId: string): string | null {
    return this.commentOwners.get(commentId) || null
  }

  grantPermission(commentId: string, userId: string, level: PermissionLevel, grantedBy: string): CommentPermission {
    if (!this.permissions.has(commentId)) {
      this.permissions.set(commentId, new Map())
    }

    const permission: CommentPermission = {
      commentId,
      userId,
      permissionLevel: level,
      grantedAt: Date.now(),
      grantedBy
    }

    this.permissions.get(commentId)!.set(userId, permission)
    return permission
  }

  revokePermission(commentId: string, userId: string): boolean {
    const commentPerms = this.permissions.get(commentId)
    if (!commentPerms) return false
    return commentPerms.delete(userId)
  }

  getPermissionLevel(commentId: string, userId: string): PermissionLevel {
    return this.permissions.get(commentId)?.get(userId)?.permissionLevel || 'none'
  }

  canView(commentId: string, userId: string): boolean {
    const level = this.getPermissionLevel(commentId, userId)
    return level !== 'none'
  }

  canEdit(commentId: string, userId: string): boolean {
    const level = this.getPermissionLevel(commentId, userId)
    return level === 'owner' || level === 'editor'
  }

  canDelete(commentId: string, userId: string): boolean {
    return this.getPermissionLevel(commentId, userId) === 'owner'
  }

  canChangePermissions(commentId: string, userId: string): boolean {
    return this.getPermissionLevel(commentId, userId) === 'owner'
  }

  getPermissionsByComment(commentId: string): CommentPermission[] {
    return Array.from(this.permissions.get(commentId)?.values() || [])
      .sort((a, b) => b.grantedAt - a.grantedAt)
  }

  getPermissionsByUser(userId: string): CommentPermission[] {
    const userPerms: CommentPermission[] = []
    this.permissions.forEach(commentPerms => {
      const perm = commentPerms.get(userId)
      if (perm) userPerms.push(perm)
    })
    return userPerms.sort((a, b) => b.grantedAt - a.grantedAt)
  }

  getUsersWithAccess(commentId: string): Map<string, PermissionLevel> {
    const users = new Map<string, PermissionLevel>()
    const commentPerms = this.permissions.get(commentId) || new Map()
    commentPerms.forEach((perm, userId) => {
      if (perm.permissionLevel !== 'none') {
        users.set(userId, perm.permissionLevel)
      }
    })
    return users
  }

  shareWithUser(commentId: string, userId: string, level: PermissionLevel = 'viewer', grantedBy: string): CommentPermission {
    return this.grantPermission(commentId, userId, level, grantedBy)
  }

  shareWithTeam(commentId: string, teamUserIds: string[], level: PermissionLevel = 'viewer', grantedBy: string): Map<string, CommentPermission> {
    const results = new Map<string, CommentPermission>()
    teamUserIds.forEach(userId => {
      results.set(userId, this.grantPermission(commentId, userId, level, grantedBy))
    })
    return results
  }

  makePublic(commentId: string): void {
    this.grantPermission(commentId, 'public', 'viewer', 'system')
  }

  makePrivate(commentId: string): void {
    this.revokePermission(commentId, 'public')
  }

  isPublic(commentId: string): boolean {
    return this.getPermissionLevel(commentId, 'public') === 'viewer'
  }

  getAccessStats(commentId: string): {owner: string | null, editors: number, viewers: number, isPublic: boolean} {
    const perms = this.getPermissionsByComment(commentId)
    return {
      owner: this.getCommentOwner(commentId),
      editors: perms.filter(p => p.permissionLevel === 'editor').length,
      viewers: perms.filter(p => p.permissionLevel === 'viewer').length,
      isPublic: this.isPublic(commentId)
    }
  }
}

export const commentPermissionsManager = new CommentPermissionsManager()
