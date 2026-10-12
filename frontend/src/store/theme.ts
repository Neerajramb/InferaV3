import { create } from 'zustand'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'infera-theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function apply(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && media().matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0c0e' : '#f4f5f7')
}

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useTheme = create<ThemeState>((set) => ({
  preference: readPreference(),
  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* storage can be unavailable in private windows */
    }
    apply(preference)
    set({ preference })
  },
}))

export function initTheme() {
  apply(useTheme.getState().preference)
  media().addEventListener('change', () => {
    if (useTheme.getState().preference === 'system') apply('system')
  })
}
