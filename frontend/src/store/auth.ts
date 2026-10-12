import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Me } from '../lib/types'

interface AuthState {
  user: Me | null
  access: string | null
  refresh: string | null
  setSession: (session: { access: string; refresh: string; user: Me }) => void
  setTokens: (tokens: { access: string; refresh?: string }) => void
  setUser: (user: Me) => void
  clear: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,
      setSession: ({ access, refresh, user }) => set({ access, refresh, user }),
      setTokens: ({ access, refresh }) => set((state) => ({ access, refresh: refresh ?? state.refresh })),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, access: null, refresh: null }),
    }),
    { name: 'infera-auth' },
  ),
)
