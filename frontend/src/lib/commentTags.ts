/**
 * Comment tagging and categorization system
 */

export interface CommentTag {
  tagId: string
  name: string
  color: string
  description?: string
  createdAt: number
  usageCount: number
}

export interface TagAssignment {
  tagId: string
  commentId: string
  assignedAt: number
  assignedBy: string
}

class CommentTagManager {
  private tags: Map<string, CommentTag> = new Map()
  private assignments: Map<string, Set<string>> = new Map()
  private nextTagId = 0

  createTag(name: string, color: string, description?: string): CommentTag {
    const tag: CommentTag = {
      tagId: `tag-${++this.nextTagId}`,
      name,
      color,
      description,
      createdAt: Date.now(),
      usageCount: 0
    }

    this.tags.set(tag.tagId, tag)
    return tag
  }

  getTag(tagId: string): CommentTag | null {
    return this.tags.get(tagId) || null
  }

  getAllTags(): CommentTag[] {
    return Array.from(this.tags.values())
      .sort((a, b) => b.usageCount - a.usageCount)
  }

  updateTag(tagId: string, updates: Partial<CommentTag>): CommentTag | null {
    const tag = this.tags.get(tagId)
    if (!tag) return null

    Object.assign(tag, updates)
    return tag
  }

  deleteTag(tagId: string): boolean {
    if (!this.tags.has(tagId)) return false

    this.tags.delete(tagId)
    this.assignments.delete(tagId)
    return true
  }

  assignTag(commentId: string, tagId: string, assignedBy: string): TagAssignment | null {
    const tag = this.tags.get(tagId)
    if (!tag) return null

    if (!this.assignments.has(commentId)) {
      this.assignments.set(commentId, new Set())
    }

    this.assignments.get(commentId)!.add(tagId)
    tag.usageCount++

    return {
      tagId,
      commentId,
      assignedAt: Date.now(),
      assignedBy
    }
  }

  removeTag(commentId: string, tagId: string): boolean {
    const tags = this.assignments.get(commentId)
    if (!tags || !tags.has(tagId)) return false

    tags.delete(tagId)
    const tag = this.tags.get(tagId)
    if (tag && tag.usageCount > 0) {
      tag.usageCount--
    }

    return true
  }

  getCommentTags(commentId: string): CommentTag[] {
    const tagIds = this.assignments.get(commentId) || new Set()
    return Array.from(tagIds)
      .map(tagId => this.tags.get(tagId))
      .filter(tag => tag !== null) as CommentTag[]
  }

  getCommentsByTag(tagId: string): string[] {
    const commentIds: string[] = []
    this.assignments.forEach((tagSet, commentId) => {
      if (tagSet.has(tagId)) {
        commentIds.push(commentId)
      }
    })
    return commentIds
  }

  hasTag(commentId: string, tagId: string): boolean {
    return (this.assignments.get(commentId) || new Set()).has(tagId)
  }

  getPopularTags(limit = 10): CommentTag[] {
    return Array.from(this.tags.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  searchTags(query: string): CommentTag[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.tags.values())
      .filter(tag => tag.name.toLowerCase().includes(lowerQuery) ||
                     (tag.description && tag.description.toLowerCase().includes(lowerQuery)))
      .sort((a, b) => b.usageCount - a.usageCount)
  }

  getTagStats(): {
    totalTags: number
    tagsByUsage: Array<{tag: CommentTag, count: number}>
  } {
    return {
      totalTags: this.tags.size,
      tagsByUsage: Array.from(this.tags.values())
        .map(tag => ({tag, count: tag.usageCount}))
        .sort((a, b) => b.count - a.count)
    }
  }

  mergeTagsIntoOne(sourceTags: string[], targetTagId: string): boolean {
    const targetTag = this.tags.get(targetTagId)
    if (!targetTag) return false

    const affectedComments = new Set<string>()

    sourceTags.forEach(sourceTagId => {
      if (sourceTagId === targetTagId) return

      const comments = this.getCommentsByTag(sourceTagId)
      comments.forEach(commentId => {
        this.assignTag(commentId, targetTagId, 'system')
        affectedComments.add(commentId)
      })

      this.deleteTag(sourceTagId)
    })

    return true
  }
}

export const commentTagManager = new CommentTagManager()
