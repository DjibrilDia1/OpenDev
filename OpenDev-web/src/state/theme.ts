import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'
const storageKey = 'opendev:theme:v1'
const listeners = new Set<() => void>()
let preference: Theme | null = null
let current: Theme = 'light'
let initialized = false

function readPreference(): Theme | null {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function applyTheme() {
  current =
    preference ??
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  document.documentElement.dataset.theme = current
  document.documentElement.style.colorScheme = current
  listeners.forEach((listener) => listener())
}

export function initializeTheme() {
  if (initialized) return
  initialized = true
  preference = readPreference()
  applyTheme()
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (preference === null) applyTheme()
  })
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      preference = readPreference()
      applyTheme()
    }
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => 'light' as Theme,
  )
  return {
    theme,
    toggleTheme() {
      preference = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(storageKey, preference)
      } catch {
        /* Session-only if storage is unavailable. */
      }
      applyTheme()
    },
  }
}
