'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { ShoppingCart, Package, Wrench } from 'lucide-react'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn)
  const cartCount = useCartStore((s) => s.totalCount)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isLoggedIn()) {
      router.replace('/login')
    }
  }, [isLoggedIn, mounted, router])

  if (!mounted) return null
  if (!isLoggedIn()) return null

  const navItems = [
    { href: '/build', icon: Wrench, label: '주문제작' },
    { href: '/cart', icon: ShoppingCart, label: '장바구니' },
    { href: '/orders', icon: Package, label: '내 주문' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/build" className="text-xl font-bold text-gray-900 tracking-tight">
            융스위치
          </Link>
          <Link href="/cart" className="relative p-2">
            <ShoppingCart className="w-6 h-6 text-gray-700" />
            {cartCount() > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {cartCount()}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-bottom">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
