export interface ValidationError {
  field: string
  message: string
}

export class CommentValidator {
  validate(content: string): ValidationError[] {
    const errors: ValidationError[] = []

    if (!content || content.trim().length === 0) {
      errors.push({field: 'content', message: 'Comment cannot be empty'})
    } else if (content.length > 5000) {
      errors.push({field: 'content', message: 'Comment exceeds 5000 characters'})
    } else if (content.length < 1) {
      errors.push({field: 'content', message: 'Comment must be at least 1 character'})
    }

    return errors
  }

  isValid(content: string): boolean {
    return this.validate(content).length === 0
  }
}

export const commentValidator = new CommentValidator()
