import { useMemo } from 'react'
import { commentValidator } from '../lib/commentValidation'

export function useCommentValidation(content: string) {
  const errors = useMemo(() => commentValidator.validate(content), [content])
  const isValid = useMemo(() => commentValidator.isValid(content), [content])
  return {errors, isValid}
}
