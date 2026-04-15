'use client'

import { CartItem } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import Button from '@/components/ui/Button'
import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  items: CartItem[]
  totalPrice: number
  showPrice: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function OrderSummaryModal({
  items,
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '견적 요청에 실패했습니다.'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">견적 요청 확인</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 max-h-80 overflow-y-auto flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">견적 상품</p>
            {items.map((item) => (
              <div key={item.id} className="text-sm text-gray-800 py-1.5 border-b border-gray-100 last:border-0">
                {item.item_type === 'single' ? (
                  <>
                    <span className="font-medium">낱개부품 · {item.single_name}</span>
                    <span className="text-gray-500"> × {item.quantity}개</span>
                    {item.single_color_name && (
                      <p className="text-xs text-gray-400 mt-0.5">색상: {item.single_color_name}</p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-medium">{item.gang_count}구 · {item.frame_color.name}</span>
                    <span className="text-gray-500"> × {item.quantity}개</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.modules.map((m, i) => (
                        <span key={i} className="text-xs text-gray-500">{i + 1}: {m.module_name}</span>
                      ))}
                    </div>
                    {item.embedded_box && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        + {item.embedded_box.name} × {item.embedded_box_quantity ?? 1}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {showPrice && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-gray-500">총 견적 금액</span>
              <span className="font-bold text-gray-900">{formatPrice(totalPrice)}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-gray-400 text-center">
            요청 후 견적서 링크를 발송해드립니다.
          </p>
          <Button onClick={handleConfirm} loading={loading} fullWidth size="lg">
            견적 요청하기
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth>
            취소
          </Button>
        </div>
      </div>
    </>
  )
}
