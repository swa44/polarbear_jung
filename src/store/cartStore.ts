'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types'
import { getFrameColorPrice } from '@/lib/utils'

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  totalCount: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => ({ items: [...state.items, item] }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }))
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
      },

      clearCart: () => set({ items: [] }),

      totalCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, item) => {
          const framePrice = getFrameColorPrice(item.frame_color, item.gang_count)
          const modulesPrice = item.modules.reduce((s, m) => s + m.module_price, 0)
          const boxPrice = item.embedded_box?.price ?? 0
          return sum + (framePrice + modulesPrice + boxPrice) * item.quantity
        }, 0),
    }),
    {
      name: 'jungswitch-cart',
    }
  )
)
