/**
 * Comment cross-references and linking system
 */

export interface CommentLink {
  linkId: string
  sourceCommentId: string
  targetCommentId: string
  linkType: 'references' | 'related_to' | 'duplicates' | 'depends_on' | 'blocks'
  createdAt: number
  createdBy: string
  metadata?: Record<string, any>
}

class CommentLinkManager {
  private links: Map<string, CommentLink> = new Map()
  private nextLinkId = 0

  createLink(source: string, target: string, type: CommentLink['linkType'], createdBy: string, metadata?: Record<string, any>): CommentLink {
    const link: CommentLink = {
      linkId: `link-${++this.nextLinkId}`,
      sourceCommentId: source,
      targetCommentId: target,
      linkType: type,
      createdAt: Date.now(),
      createdBy,
      metadata
    }

    this.links.set(link.linkId, link)
    return link
  }

  removeLink(linkId: string): boolean {
    return this.links.delete(linkId)
  }

  getLinksFromComment(commentId: string): CommentLink[] {
    return Array.from(this.links.values())
      .filter(l => l.sourceCommentId === commentId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  getLinksToComment(commentId: string): CommentLink[] {
    return Array.from(this.links.values())
      .filter(l => l.targetCommentId === commentId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  getAllLinksForComment(commentId: string): CommentLink[] {
    return Array.from(this.links.values())
      .filter(l => l.sourceCommentId === commentId || l.targetCommentId === commentId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  getLinksByType(type: CommentLink['linkType']): CommentLink[] {
    return Array.from(this.links.values())
      .filter(l => l.linkType === type)
  }

  getRelatedComments(commentId: string): string[] {
    const related = new Set<string>()

    this.links.forEach(link => {
      if (link.sourceCommentId === commentId) {
        related.add(link.targetCommentId)
      } else if (link.targetCommentId === commentId) {
        related.add(link.sourceCommentId)
      }
    })

    return Array.from(related)
  }

  findDuplicates(commentId: string): string[] {
    return Array.from(this.links.values())
      .filter(l => (l.sourceCommentId === commentId || l.targetCommentId === commentId) && l.linkType === 'duplicates')
      .map(l => l.sourceCommentId === commentId ? l.targetCommentId : l.sourceCommentId)
  }

  getLinkGraph(): {nodes: string[], edges: Array<{source: string, target: string, type: string}>} {
    const nodes = new Set<string>()
    const edges: Array<{source: string, target: string, type: string}> = []

    this.links.forEach(link => {
      nodes.add(link.sourceCommentId)
      nodes.add(link.targetCommentId)
      edges.push({
        source: link.sourceCommentId,
        target: link.targetCommentId,
        type: link.linkType
      })
    })

    return {
      nodes: Array.from(nodes),
      edges
    }
  }

  getLinkStats(): {
    totalLinks: number
    byType: Record<string, number>
    linkedComments: number
  } {
    const byType: Record<string, number> = {}
    const linkedComments = new Set<string>()

    this.links.forEach(link => {
      byType[link.linkType] = (byType[link.linkType] || 0) + 1
      linkedComments.add(link.sourceCommentId)
      linkedComments.add(link.targetCommentId)
    })

    return {
      totalLinks: this.links.size,
      byType,
      linkedComments: linkedComments.size
    }
  }
}

export const commentLinkManager = new CommentLinkManager()
