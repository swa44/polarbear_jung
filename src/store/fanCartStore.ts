'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FanCartItem {
  id: string
  fan_id: string
  fan_name: string
  color: string
  image_url: string
  unit_price: number
  quantity: number
}

interface FanCartStore {
  items: FanCartItem[]
  addItem: (item: FanCartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  totalCount: () => number
}

export const useFanCartStore = create<FanCartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => set((state) => ({ items: [...state.items, item] })),

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }))
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      clearCart: () => set({ items: [] }),

      totalCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'lucciair-fan-cart' }
  )
)
