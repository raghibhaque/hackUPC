export class LanguageDetector {
  detectLanguage(text: string): string {
    const englishWords = text.match(/\b[a-z]+\b/gi) || []
    const nonAscii = text.match(/[^\x00-\x7F]/g) || []
    return nonAscii.length > englishWords.length ? 'multilingual' : 'english'
  }

  requiresTranslation(text: string): boolean {
    return this.detectLanguage(text) === 'multilingual'
  }
}

export const languageDetector = new LanguageDetector()
