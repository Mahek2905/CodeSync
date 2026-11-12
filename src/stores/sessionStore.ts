import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

type SessionState = {
  user: User | null
  token: string | null
  signIn: (user: User, token?: string) => void
  signOut: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      signIn: (user, token = 'preview-jwt-token') => set({ user, token }),
      signOut: () => set({ user: null, token: null }),
    }),
    { name: 'codesync-session' },
  ),
)
