/**
 * Comment export utilities for multiple formats
 */

import type { CommentThread, Comment } from './comments'

export type ExportFormat = 'json' | 'csv' | 'markdown'

class CommentExporter {
  exportAsJSON(threads: CommentThread[], title = 'Comments Export'): string {
    const comments: any[] = []

    threads.forEach(thread => {
      comments.push(this.serializeComment(thread.root))
      thread.replies.forEach(reply => {
        comments.push(this.serializeComment(reply))
      })
    })

    const data = {
      title,
      exportedAt: new Date().toISOString(),
      totalComments: comments.length,
      comments
    }

    return JSON.stringify(data, null, 2)
  }

  exportAsCSV(threads: CommentThread[]): string {
    const headers = ['ID', 'Author', 'Content', 'Type', 'Target', 'Resolved', 'Reply To', 'Reactions', 'Mentions', 'Created At']
    const rows: string[][] = [headers]

    threads.forEach(thread => {
      rows.push(this.commentToCSVRow(thread.root))
      thread.replies.forEach(reply => {
        rows.push(this.commentToCSVRow(reply))
      })
    })

    return rows.map(row => row.map(cell => this.escapeCSV(cell)).join(',')).join('\n')
  }

  exportAsMarkdown(threads: CommentThread[], title = 'Comments'): string {
    let markdown = `# ${title}\n\n`
    markdown += `Exported: ${new Date().toLocaleString()}\n\n`
    markdown += `Total Comments: ${this.countComments(threads)}\n\n`
    markdown += '---\n\n'

    threads.forEach((thread, idx) => {
      markdown += this.threadToMarkdown(thread, idx + 1)
      markdown += '\n---\n\n'
    })

    return markdown
  }

  private serializeComment(comment: Comment): any {
    return {
      id: comment.id,
      author: comment.author,
      content: comment.content,
      created_at: new Date(comment.created_at).toISOString(),
      updated_at: new Date(comment.updated_at).toISOString(),
      is_resolved: comment.is_resolved,
      reply_to: comment.reply_to || null,
      target_type: comment.target_type,
      target_id: comment.target_id,
      reactions: comment.reactions,
      mentions: comment.mentions
    }
  }

  private commentToCSVRow(comment: Comment): string[] {
    const reactionsStr = Object.entries(comment.reactions)
      .map(([emoji, users]) => `${emoji}(${users.length})`)
      .join('; ')

    return [
      comment.id,
      comment.author,
      comment.content,
      comment.target_type,
      comment.target_id,
      comment.is_resolved ? 'Yes' : 'No',
      comment.reply_to || '',
      reactionsStr,
      comment.mentions.join(', '),
      new Date(comment.created_at).toLocaleString()
    ]
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private threadToMarkdown(thread: CommentThread, threadNumber: number): string {
    let markdown = `## Thread #${threadNumber}\n\n`
    markdown += `**Author:** ${thread.root.author}\n\n`
    markdown += `**Content:** ${thread.root.content}\n\n`
    markdown += `**Status:** ${thread.root.is_resolved ? '✅ Resolved' : '❌ Open'}\n\n`

    if (Object.keys(thread.root.reactions).length > 0) {
      markdown += `**Reactions:** ${Object.entries(thread.root.reactions)
        .map(([emoji, users]) => `${emoji} ${users.join(', ')}`)
        .join(' | ')}\n\n`
    }

    if (thread.root.mentions.length > 0) {
      markdown += `**Mentions:** ${thread.root.mentions.map(m => `@${m}`).join(', ')}\n\n`
    }

    markdown += `**Posted:** ${new Date(thread.root.created_at).toLocaleString()}\n\n`

    if (thread.replies.length > 0) {
      markdown += '### Replies\n\n'
      thread.replies.forEach((reply, idx) => {
        markdown += `#### Reply ${idx + 1}\n`
        markdown += `**Author:** ${reply.author}\n\n`
        markdown += `**Content:** ${reply.content}\n\n`
        if (reply.mentions.length > 0) {
          markdown += `**Mentions:** ${reply.mentions.map(m => `@${m}`).join(', ')}\n\n`
        }
        markdown += `**Posted:** ${new Date(reply.created_at).toLocaleString()}\n\n`
      })
    }

    return markdown
  }

  private countComments(threads: CommentThread[]): number {
    return threads.reduce((sum, thread) => sum + 1 + thread.replies.length, 0)
  }

  generateFilename(format: ExportFormat, title: string): string {
    const timestamp = new Date().toISOString().slice(0, 10)
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const ext = format === 'csv' ? 'csv' : format === 'json' ? 'json' : 'md'
    return `comments-${sanitizedTitle}-${timestamp}.${ext}`
  }
}

export const commentExporter = new CommentExporter()
