'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Order } from '@/types'
import { formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ChevronDown, ChevronUp, Package } from 'lucide-react'
import Link from 'next/link'

function OrdersContent() {
  const searchParams = useSearchParams()
  const newOrderNumber = searchParams.get('new')

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    const res = await fetch('/api/orders')
    const data = await res.json()
    if (data.orders) setOrders(data.orders)
    setLoading(false)
  }

  const handleCancel = async (orderId: string) => {
    if (!confirm('견적을 취소하시겠습니까?')) return
    setCancellingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
      if (res.ok) await fetchOrders()
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900">내 견적</h1>

      {newOrderNumber && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-green-800">✓ 견적 요청이 접수되었습니다!</p>
          <p className="text-sm text-green-700 mt-1">견적번호: <span className="font-mono font-medium">{newOrderNumber}</span></p>
          <p className="text-xs text-green-600 mt-1">알림톡으로 전달된 링크에서 배송정보를 입력해 주세요.</p>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Package className="w-16 h-16 text-gray-200" />
          <p className="text-gray-500">아직 견적 내역이 없어요.</p>
          <Link href="/jung/build"><Button>첫 견적 구성하기</Button></Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {order.order_number}
                        </span>
                        <Badge className={ORDER_STATUS_COLOR[order.status]}>
                          {ORDER_STATUS_LABEL[order.status] || order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-3">
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {order.order_items.map((item) => {
                          const isSet = item.modules && item.modules.length > 0
                          return (
                            <div key={item.id} className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                              {isSet ? (
                                <>
                                  <p className="text-xs font-medium text-gray-700">
                                    세트 · {item.gang_count}구 {item.frame_color_name} × {item.quantity}개
                                  </p>
                                  <div className="mt-0.5 flex flex-col gap-0.5">
                                    {item.modules.map((m, i) => (
                                      <p key={i} className="text-xs text-gray-500 pl-1">
                                        {m.slot ?? i + 1}: {m.module_name}
                                      </p>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p className="text-xs text-gray-600">
                                  낱개부품 · {item.frame_color_name} × {item.quantity}개
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div>
                      {order.quote_expires_at && (
                        <>
                          <p className="text-xs text-gray-500">유효기간</p>
                          <p className="text-sm text-gray-800">{formatDate(order.quote_expires_at)}</p>
                        </>
                      )}
                      {order.tracking_company && order.tracking_number && (
                        <>
                          <p className="text-xs text-gray-500 mt-2">배송조회</p>
                          <p className="text-sm text-gray-800">
                            {order.tracking_company} · {order.tracking_number}
                          </p>
                        </>
                      )}
                      {order.shipping_address && (
                        <>
                          <p className="text-xs text-gray-500 mt-2">배송지</p>
                          <p className="text-sm text-gray-800">{order.shipping_address} {order.shipping_detail || ''}</p>
                        </>
                      )}
                    </div>


                    {['quoted', 'shipping_info_submitted', 'waiting_deposit'].includes(order.status) && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="danger"
                          size="sm"
                          loading={cancellingId === order.id}
                          onClick={() => handleCancel(order.id)}
                        >
                          견적 취소
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div>}>
      <OrdersContent />
    </Suspense>
  )
}
