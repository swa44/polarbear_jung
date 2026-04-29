'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatDate, formatPrice, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { FanOrder, FanOrderItem } from '@/types/fan'

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: {
          roadAddress: string
          jibunAddress: string
          bname: string
          buildingName: string
          apartment: 'Y' | 'N'
          zonecode: string
        }) => void
      }) => { open: () => void }
    }
  }
}

type QuoteResponse = {
  quote: FanOrder & { fan_order_items: FanOrderItem[] }
  bank: { bankName: string; bankAccount: string; bankHolder: string }
}

const DISCOUNT_RATE = 0.1
const SHIPPING_FEE = 3000

export default function FanQuotePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [data, setData] = useState<QuoteResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [trackingCopied, setTrackingCopied] = useState(false)
  const [shippingFormOpen, setShippingFormOpen] = useState(false)
  const [showReturnNotice, setShowReturnNotice] = useState(false)
  const [postcodeReady, setPostcodeReady] = useState(false)

  const [recipientName, setRecipientName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingDetail, setShippingDetail] = useState('')
  const [shippingMemo, setShippingMemo] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/fan-quotes/${token}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError('견적서를 불러올 수 없습니다.'); setLoading(false) })
  }, [token])

  useEffect(() => {
    if (window.daum?.Postcode) { setPostcodeReady(true); return }
    const script = document.createElement('script')
    script.id = 'daum-postcode-script'
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.onload = () => setPostcodeReady(true)
    document.head.appendChild(script)
  }, [])

  const canSubmitShipping = useMemo(() => {
    if (!data?.quote) return false
    return ['quoted', 'shipping_info_submitted', 'waiting_deposit'].includes(data.quote.status)
  }, [data])

  const handleSearchAddress = () => {
    if (!window.daum?.Postcode) return
    new window.daum.Postcode({
      oncomplete: (d) => setShippingAddress(d.roadAddress),
    }).open()
  }

  const handleSubmitShipping = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/fan-quotes/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName, receiverPhone, shippingAddress, shippingDetail, shippingMemo }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('538237-04-004330')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyTracking = () => {
    if (!data?.quote.tracking_number) return
    navigator.clipboard.writeText(data.quote.tracking_number)
    setTrackingCopied(true)
    setTimeout(() => setTrackingCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data?.quote) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-gray-500 text-sm text-center">{error || '견적서를 찾을 수 없습니다.'}</p>
      </div>
    )
  }

  const { quote, bank } = data
  const items = quote.fan_order_items ?? []
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const discountAmount = Math.round(subtotal * DISCOUNT_RATE)
  const discounted = subtotal - discountAmount
  const finalPrice = discounted + SHIPPING_FEE

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">실링팬 견적서</h1>
        <Badge className={ORDER_STATUS_COLOR[quote.status] ?? 'bg-gray-100 text-gray-500'}>
          {ORDER_STATUS_LABEL[quote.status] ?? quote.status}
        </Badge>
      </div>

      <p className="text-xs text-gray-400">견적번호: {quote.order_number} · {formatDate(quote.created_at)}</p>

      {/* 상품 목록 */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold text-gray-700">견적 상품</p>
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.fan_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">색상: {item.color}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-gray-700">{formatPrice(item.unit_price)} × {item.quantity}</p>
              <p className="text-xs text-gray-500">{formatPrice(item.unit_price * item.quantity)}</p>
            </div>
          </div>
        ))}

        {/* 금액 계산 */}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">상품 합계</span>
            <span className="text-gray-700">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-500 font-medium">폴라베어 특별 프로모션 (10%)</span>
            <span className="text-red-500 font-medium">−{formatPrice(discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">배송비</span>
            <span className="text-gray-700">{formatPrice(SHIPPING_FEE)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">최종 금액</span>
            <span className="text-lg font-bold text-gray-900">{formatPrice(finalPrice)}</span>
          </div>
        </div>
      </section>

      {/* 배송 조회 */}
      {quote.tracking_company && quote.tracking_number && (
        <section className="bg-orange-100 rounded-2xl border border-gray-300 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-orange-700">배송조회</p>
            <button
              onClick={handleCopyTracking}
              className="text-xs px-3 py-1.5 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {trackingCopied ? '복사됨' : '송장번호 복사'}
            </button>
          </div>
          <p className="text-sm text-orange-800">택배사: {quote.tracking_company}</p>
          <p className="text-sm text-orange-800">송장번호: {quote.tracking_number}</p>
        </section>
      )}

      {/* 입금 계좌 */}
      {!(quote.tracking_company && quote.tracking_number) && (
        <section className="bg-white rounded-2xl border border-gray-300 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">입금 계좌 안내</p>
            <button
              onClick={handleCopyAccount}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {copied ? '복사됨' : '계좌번호 복사'}
            </button>
          </div>
          <p className="text-sm text-gray-700 mt-2">은행 : 국민은행</p>
          <p className="text-sm text-gray-700">계좌 : 538237-04-004330</p>
          <p className="text-sm text-gray-700">예금주 : (주)폴라베어</p>
        </section>
      )}

      {/* 안내문 */}
      {!(quote.tracking_company && quote.tracking_number) && (
        <section className="bg-red-50 rounded-2xl border border-gray-300 p-5">
          <p className="text-sm text-red-600">･견적서 유효기간 내 배송요청이 없을 경우,<br />&nbsp;&nbsp;해당 주문서는 삭제됩니다.</p>
          <p className="text-sm text-red-600 mt-1">･배송요청이 접수된 견적서는 <br />&nbsp;&nbsp;자료증빙을 위해 저장됩니다.</p>
          <p className="text-sm text-red-600 mt-1">･입금 후 배송정보입력을 해주셔야 <br />&nbsp;&nbsp;출고가 진행됩니다.</p>
        </section>
      )}

      {/* 배송정보 입력 */}
      {!(quote.tracking_company && quote.tracking_number) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
          <h2 className="text-base font-bold text-gray-900">배송정보 입력</h2>
          {!shippingFormOpen ? (
            <Button onClick={() => setShippingFormOpen(true)} fullWidth size="lg" disabled={!canSubmitShipping || saved}>
              배송정보 입력하기
            </Button>
          ) : (
            <>
              <Input label="수령인" placeholder="수령인 이름" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} disabled={!canSubmitShipping || saved} />
              <Input label="연락처" placeholder="01012345678" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} disabled={!canSubmitShipping || saved} />
              <Input label="주소" placeholder="클릭하여 주소 검색" value={shippingAddress} onClick={handleSearchAddress} onChange={() => {}} readOnly disabled={!postcodeReady || !canSubmitShipping || saved} className="cursor-pointer" />
              <Input label="상세주소" placeholder="동/호수, 건물명" value={shippingDetail} onChange={(e) => setShippingDetail(e.target.value)} disabled={!canSubmitShipping || saved} />
              <Input label="배송메모 (선택)" placeholder="부재시 경비실 보관 등" value={shippingMemo} onChange={(e) => setShippingMemo(e.target.value)} disabled={!canSubmitShipping || saved} />
            </>
          )}
          {saved && <p className="text-sm text-green-700">배송정보가 저장되었습니다. 입금 확인 후 출고됩니다.</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {shippingFormOpen && (
            <Button onClick={() => setShowReturnNotice(true)} loading={saving} fullWidth size="lg" disabled={!canSubmitShipping || saved}>
              배송정보 제출
            </Button>
          )}
        </section>
      )}

      {/* 반품 안내 모달 */}
      {showReturnNotice && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowReturnNotice(false)} />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-gray-900">안내</h2>
            <p className="text-sm text-gray-700 leading-relaxed text-center">
              해당 제품은 개별 포장이 되어있는 제품으로<br />
              개봉 후 단순변심등의 이유로는 <br />
              반품이 되지 않습니다.<br /><br />
              <span className="font-bold text-red-600">
                반드시, 제품 수령 후 <br />
                품목 확인하시고 개봉해주세요.
              </span>
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setShowReturnNotice(false); handleSubmitShipping() }} loading={saving} fullWidth size="lg">
                확인했습니다.
              </Button>
              <Button onClick={() => setShowReturnNotice(false)} variant="ghost" fullWidth>
                취소
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
