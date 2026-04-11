'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionStore {
  name: string | null
  phone: string | null
  hydrated: boolean
  setHydrated: (hydrated: boolean) => void
  setSession: (name: string, phone: string) => void
  clearSession: () => void
  isLoggedIn: () => boolean
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      name: null,
      phone: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),

      setSession: (name, phone) => set({ name, phone }),

      clearSession: () => set({ name: null, phone: null }),

      isLoggedIn: () => !!get().phone,
    }),
    {
      name: 'jungswitch-session',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
