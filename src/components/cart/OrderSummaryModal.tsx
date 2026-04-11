'use client'

import { CartItem } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import Button from '@/components/ui/Button'
import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  items: CartItem[]
  recipientName: string
  shippingAddress: string
  shippingDetail: string
  totalPrice: number
  showPrice: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function OrderSummaryModal({
  items,
  recipientName,
  shippingAddress,
  shippingDetail,
  totalPrice,
  showPrice,
  onConfirm,
  onClose,
}: Props) {
  useLockBodyScroll(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
    } catch (e: any) {
      setError(e.message || '주문에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">주문 확인</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 max-h-80 overflow-y-auto flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">주문 상품</p>
            {items.map((item) => (
              <div key={item.id} className="text-sm text-gray-800 py-1.5 border-b border-gray-100 last:border-0">
                <span className="font-medium">{item.gang_count}구 · {item.frame_color.name}</span>
                <span className="text-gray-500"> × {item.quantity}개</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.modules.map((m, i) => (
                    <span key={i} className="text-xs text-gray-500">{i + 1}: {m.module_name}</span>
                  ))}
                </div>
                {item.embedded_box && (
                  <p className="text-xs text-gray-400 mt-0.5">+ {item.embedded_box.name}</p>
                )}
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">수신인</p>
            <p className="text-sm text-gray-800">{recipientName}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">배송지</p>
            <p className="text-sm text-gray-800">{shippingAddress}</p>
            {shippingDetail && <p className="text-sm text-gray-600">{shippingDetail}</p>}
          </div>

          {showPrice && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-gray-500">총 금액</span>
              <span className="font-bold text-gray-900">{formatPrice(totalPrice)}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-gray-400 text-center">
            주문 접수 후 담당자가 연락드려 입금 안내를 드립니다.
          </p>
          <Button onClick={handleConfirm} loading={loading} fullWidth size="lg">
            주문 접수하기
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth>
            취소
          </Button>
        </div>
      </div>
    </>
  )
}
