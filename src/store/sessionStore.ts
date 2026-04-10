'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionStore {
  name: string | null
  phone: string | null
  setSession: (name: string, phone: string) => void
  clearSession: () => void
  isLoggedIn: () => boolean
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      name: null,
      phone: null,

      setSession: (name, phone) => set({ name, phone }),

      clearSession: () => set({ name: null, phone: null }),

      isLoggedIn: () => !!get().phone,
    }),
    {
      name: 'jungswitch-session',
    }
  )
)
