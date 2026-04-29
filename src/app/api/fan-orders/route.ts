import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { generateQuoteToken } from '@/lib/utils'
import { sendQuoteAlimtalk, sendFanOrderNotifyAlimtalk } from '@/lib/alimtalk'
import { FanCartItem } from '@/store/fanCartStore'

function getSession(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const raw = cookieStore.get('customer_session')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as { name: string; phone: string }
  } catch {
    return null
  }
}

function getQuoteBaseUrl(req: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL
  if (envBase?.trim()) return envBase.replace(/\/$/, '')
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const forwardedHost = req.headers.get('x-forwarded-host')
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`
  const host = req.headers.get('host')
  if (host) {
    const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1')
    return `${isLocal ? 'http' : 'https'}://${host}`
  }
  return 'http://localhost:3000'
}

function getKstDateKey(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function generateOrderNumber(supabase: ReturnType<typeof createServiceClient>): Promise<string> {
  const dateKey = getKstDateKey()
  const prefix = `LC-${dateKey}-`
  const { data, error } = await supabase
    .from('fan_orders')
    .select('order_number')
    .like('order_number', `${prefix}%`)
    .order('order_number', { ascending: false })
    .limit(1)
  if (error) throw error
  const last = data?.[0]?.order_number
  const lastSeq = last ? Number(last.slice(prefix.length)) : 0
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1
  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = getSession(cookieStore)
    if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('fan_orders')
      .select('*, fan_order_items(*)')
      .eq('customer_phone', session.phone)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ orders: data })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = getSession(cookieStore)
    if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const { cartItems } = await req.json() as { cartItems: FanCartItem[] }
    if (!cartItems?.length) return NextResponse.json({ error: '견적 품목이 비어있습니다.' }, { status: 400 })

    const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
    const discountAmount = Math.round(subtotal * 0.1)
    const totalPrice = subtotal - discountAmount + 3000

    const supabase = createServiceClient()
    const quoteToken = generateQuoteToken()
    const quoteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    let createdOrder: { id: string; order_number: string } | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNumber = await generateOrderNumber(supabase)
      const { data: order, error: orderError } = await supabase
        .from('fan_orders')
        .insert({
          order_number: orderNumber,
          customer_name: session.name,
          customer_phone: session.phone,
          status: 'quoted',
          total_price: totalPrice,
          shipping_address: '',
          quote_token: quoteToken,
          quote_expires_at: quoteExpiresAt,
          quoted_at: new Date().toISOString(),
        })
        .select('id, order_number')
        .single()
      if (!orderError && order) { createdOrder = order; break }
      if (orderError?.code === '23505') continue
      throw orderError
    }
    if (!createdOrder) return NextResponse.json({ error: '견적번호 생성에 실패했습니다.' }, { status: 500 })

    const items = cartItems.map((item) => ({
      order_id: createdOrder!.id,
      fan_id: item.fan_id,
      fan_name: item.fan_name,
      color: item.color,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.unit_price * item.quantity,
    }))
    const { error: itemsError } = await supabase.from('fan_order_items').insert(items)
    if (itemsError) throw itemsError

    const quoteUrl = `${getQuoteBaseUrl(req)}/fan-quotes/${quoteToken}`
    const alimtalkSent = await sendQuoteAlimtalk({ to: session.phone, quoteUrl })

    // 관리자 알림
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'lucciair_notify_phones')
      .single()
    if (settingsData?.value) {
      const phones = settingsData.value.split(',').map((p: string) => p.trim()).filter(Boolean)
      sendFanOrderNotifyAlimtalk(phones).catch((e) => console.error('[Fan order notify error]', e))
    }

    return NextResponse.json({ success: true, orderNumber: createdOrder.order_number, quoteUrl, alimtalkSent })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '견적 접수에 실패했습니다.' }, { status: 500 })
  }
}
