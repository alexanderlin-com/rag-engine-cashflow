'use client'

import { useEffect, useState } from 'react'

// First, define the three possible states.
type Theme = 'light' | 'dark' | 'system'

export default function ThemeToggle() {
  // Use a string state that defaults to 'system'.
  const [theme, setTheme] = useState<Theme>('system')

  // This hook runs ONCE on mount to load the saved theme from storage.
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
  }, [])

  // This hook runs whenever the 'theme' state changes to APPLY the styles.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    // This function applies the theme based on the current state.
    const applyTheme = () => {
      if (theme === 'system') {
        document.documentElement.classList.toggle('dark', mediaQuery.matches)
        localStorage.removeItem('theme')
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        localStorage.setItem('theme', theme)
      }
    }

    applyTheme()

    // This listens for OS-level theme changes and updates the UI in real-time
    // ONLY if the current setting is 'system'.
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme])

  // This function cycles through the three states in order.
  const cycleTheme = () => {
    const themes: Theme[] = ['system', 'light', 'dark']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }

  return (
    <button
      onClick={cycleTheme}
      aria-label="Toggle theme"
      className="opacity-70 hover:opacity-100 text-sm w-20 text-center border border-neutral-300 dark:border-neutral-700 rounded-md py-1"
    >
      {/* Capitalize the first letter of the current theme state. */}
      {theme.charAt(0).toUpperCase() + theme.slice(1)}
    </button>
  )
}