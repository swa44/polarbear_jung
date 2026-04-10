'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { useSessionStore } from '@/store/sessionStore'
import { useRouter } from 'next/navigation'
import { cn, formatPrice } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Trash2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import OrderSummaryModal from '@/components/cart/OrderSummaryModal'

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCartStore()
  const { name, phone } = useSessionStore()

  const [showPrice, setShowPrice] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingDetail, setShippingDetail] = useState('')
  const [addressError, setAddressError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setShowPrice(d.show_price === 'true'))
  }, [])

  const handleOrderClick = () => {
    if (!shippingAddress.trim()) {
      setAddressError('배송지 주소를 입력해주세요.')
      return
    }
    setAddressError('')
    setShowSummary(true)
  }

  const handleConfirmOrder = async () => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItems: items, shippingAddress, shippingDetail }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    clearCart()
    router.push(`/orders?new=${data.orderNumber}`)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 gap-4">
        <ShoppingBag className="w-16 h-16 text-gray-200" />
        <p className="text-gray-500 text-center">장바구니가 비어있어요.<br />스위치를 구성해보세요.</p>
        <Link href="/build">
          <Button>주문 제작하기</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">장바구니</h1>
        <button onClick={clearCart} className="text-sm text-red-500">
          전체 삭제
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const itemUnitPrice = item.frame_color.price
            + item.modules.reduce((s, m) => s + m.module_price, 0)
            + (item.embedded_box?.price ?? 0)

          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {item.gang_count}구 · {item.frame_color.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.modules.map((m, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        {i + 1}번: {m.module_name}
                      </span>
                    ))}
                  </div>
                  {item.embedded_box && (
                    <p className="text-xs text-gray-500 mt-1">매립박스: {item.embedded_box.name}</p>
                  )}
                  {showPrice && (
                    <p className="text-sm text-gray-700 mt-2">
                      {formatPrice(itemUnitPrice)} × {item.quantity} = <span className="font-semibold">{formatPrice(itemUnitPrice * item.quantity)}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">수량</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 더 담기 */}
      <Link href="/build">
        <button className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
          + 상품 더 담기
        </button>
      </Link>

      {/* 배송지 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900">배송지 정보</h2>
        <Input
          label="주소"
          placeholder="도로명 주소를 입력해주세요"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          error={addressError}
        />
        <Input
          label="상세 주소 (선택)"
          placeholder="동/호수, 건물명 등"
          value={shippingDetail}
          onChange={(e) => setShippingDetail(e.target.value)}
        />
      </div>

      {/* 주문 합계 & 버튼 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        {showPrice && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">총 주문 금액</span>
            <span className="text-lg font-bold text-gray-900">{formatPrice(totalPrice())}</span>
          </div>
        )}
        <p className="text-xs text-gray-400">
          주문 접수 후 담당자가 연락드려 입금 안내를 드립니다.
        </p>
        <Button onClick={handleOrderClick} fullWidth size="lg">
          주문 접수하기
        </Button>
      </div>

      {/* 주문 확인 모달 */}
      {showSummary && (
        <OrderSummaryModal
          items={items}
          shippingAddress={shippingAddress}
          shippingDetail={shippingDetail}
          totalPrice={totalPrice()}
          showPrice={showPrice}
          onConfirm={handleConfirmOrder}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}
