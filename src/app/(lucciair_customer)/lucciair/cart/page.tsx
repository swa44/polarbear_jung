'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ShoppingBag } from 'lucide-react'
import { useFanCartStore } from '@/store/fanCartStore'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

const DISCOUNT_RATE = 0.1
const SHIPPING_FEE = 3000

function SummaryModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  useLockBodyScroll(true)
  const { items } = useFanCartStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subtotal = items.reduce((s, i) => s + (i.unit_price ?? 0) * i.quantity, 0)
  const discount = Math.round(subtotal * DISCOUNT_RATE)
  const total = subtotal - discount + SHIPPING_FEE

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '견적 요청에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">견적 요청 확인</h2>
        </div>
        <div className="px-5 py-4 max-h-72 overflow-y-auto flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.id} className="text-sm text-gray-800 py-1.5 border-b border-gray-100 last:border-0">
              <span className="font-medium">{item.fan_name} · {item.color}</span>
              <span className="text-gray-500"> × {item.quantity}개</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-gray-400 text-center">요청 후 견적서 링크를 알림톡으로 발송해드립니다.</p>
          <Button onClick={handleConfirm} loading={loading} fullWidth size="lg">견적 요청하기</Button>
          <Button onClick={onClose} variant="ghost" fullWidth>취소</Button>
        </div>
      </div>
    </>
  )
}

export default function LucciairCartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, clearCart } = useFanCartStore()
  const [showSummary, setShowSummary] = useState(false)

  const handleConfirmQuote = async () => {
    const res = await fetch('/api/fan-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItems: items }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    clearCart()
    router.push(`/lucciair/orders?new=${data.orderNumber}`)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 gap-4">
        <ShoppingBag className="w-16 h-16 text-gray-200" />
        <p className="text-gray-500 text-center">견적 바구니가 비어있어요.<br />실링팬을 골라보세요.</p>
        <Link href="/lucciair/build"><Button>제품 보러가기</Button></Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">견적 바구니</h1>
        <button onClick={clearCart} className="text-sm text-red-500">전체 삭제</button>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 items-start">
            <div className="w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100" style={{ aspectRatio: '9/11' }}>
              <img src={item.image_url} alt={`${item.fan_name} ${item.color}`} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{item.fan_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.color}</p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold">−</button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold">+</button>
              </div>
            </div>
            <button onClick={() => removeItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Button onClick={() => setShowSummary(true)} fullWidth size="lg">견적 요청하기</Button>

      {showSummary && (
        <SummaryModal onConfirm={handleConfirmQuote} onClose={() => setShowSummary(false)} />
      )}
    </div>
  )
}
