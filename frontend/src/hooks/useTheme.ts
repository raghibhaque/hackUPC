import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null

    if (stored) {
      setThemeState(stored)
      applyTheme(stored)
    } else {
      // Default to dark mode, can be toggled by user
      setThemeState('dark')
      applyTheme('dark')
    }

    setIsLoaded(true)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  return { theme, setTheme, isLoaded }
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}
