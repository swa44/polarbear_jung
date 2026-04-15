import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { FrameColor } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원'
}

export function getFrameColorPrice(frameColor: FrameColor, gangCount: number): number {
  const gangPriceMap = {
    1: frameColor.price_1,
    2: frameColor.price_2,
    3: frameColor.price_3,
    4: frameColor.price_4,
    5: frameColor.price_5,
  } as const

  const gangPrice = gangPriceMap[gangCount as keyof typeof gangPriceMap]
  if (typeof gangPrice === 'number') return gangPrice
  return frameColor.price ?? 0
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function generateQuoteToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '접수됨(기존)',
  confirmed: '확인됨(기존)',
  quoted: '견적 발송',
  shipping_info_submitted: '배송정보 입력',
  waiting_deposit: '입금 대기',
  paid: '입금 확인',
  shipped: '발송됨',
  cancelled: '취소됨',
  expired: '만료됨',
}

export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  quoted: 'bg-yellow-100 text-yellow-800',
  shipping_info_submitted: 'bg-blue-100 text-blue-800',
  waiting_deposit: 'bg-indigo-100 text-indigo-800',
  paid: 'bg-emerald-100 text-emerald-800',
  shipped: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
  expired: 'bg-orange-100 text-orange-700',
}
