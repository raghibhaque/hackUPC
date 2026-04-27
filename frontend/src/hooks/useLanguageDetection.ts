import { useMemo } from 'react'
import { languageDetector } from '../lib/commentLanguageDetection'

export function useLanguageDetection(text: string) {
  const language = useMemo(() => languageDetector.detectLanguage(text), [text])
  const needsTranslation = useMemo(() => languageDetector.requiresTranslation(text), [text])
  return {language, needsTranslation}
}
