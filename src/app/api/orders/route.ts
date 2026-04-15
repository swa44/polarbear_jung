import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { generateQuoteToken, getFrameColorPrice } from '@/lib/utils'
import { sendQuoteAlimtalk } from '@/lib/alimtalk'
import { CartItem } from '@/types'

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
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

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
  const year = kst.getUTCFullYear()
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kst.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

async function generateQuoteNumber(supabase: ReturnType<typeof createServiceClient>): Promise<string> {
  const dateKey = getKstDateKey()
  const prefix = `PY-${dateKey}-`

  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `${prefix}%`)
    .order('order_number', { ascending: false })
    .limit(1)

  if (error) throw error

  const lastNumber = data?.[0]?.order_number
  const lastSeq = lastNumber ? Number(lastNumber.slice(prefix.length)) : 0
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1
  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = getSession(cookieStore)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
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
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { cartItems } = await req.json() as { cartItems: CartItem[] }

    if (!cartItems?.length) {
      return NextResponse.json({ error: '견적 품목이 비어있습니다.' }, { status: 400 })
    }

    const totalPrice = cartItems.reduce((sum, item) => {
      if (item.item_type === 'single') {
        const unit = item.single_unit_price ?? 0
        return sum + unit * item.quantity
      }

      const framePrice = getFrameColorPrice(item.frame_color, item.gang_count)
      const modulesPrice = item.modules.reduce((s, m) => s + m.module_price, 0)
      const boxPrice = item.embedded_box?.price ?? 0
      const boxQuantity = item.embedded_box ? (item.embedded_box_quantity ?? 1) : 0
      const setTotal = (framePrice + modulesPrice) * item.quantity
      const boxTotal = boxPrice * boxQuantity
      return sum + setTotal + boxTotal
    }, 0)

    const supabase = createServiceClient()
    const quoteToken = generateQuoteToken()
    const quoteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    let createdOrder: { id: string; order_number: string } | null = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const orderNumber = await generateQuoteNumber(supabase)
      const { data: order, error: orderError } = await supabase
        .from('orders')
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

      if (!orderError && order) {
        createdOrder = order
        break
      }

      if (orderError?.code === '23505') {
        continue
      }

      throw orderError
    }

    if (!createdOrder) {
      return NextResponse.json({ error: '견적번호 생성에 실패했습니다. 다시 시도해주세요.' }, { status: 500 })
    }

    const items = cartItems.map((item) => {
      if (item.item_type === 'single') {
        const unitPrice = item.single_unit_price ?? 0
        const singleName = item.single_name ?? '낱개부품'
        const colorName = item.single_color_name ? ` (${item.single_color_name})` : ''

        return {
          order_id: createdOrder.id,
          gang_count: item.gang_count || 1,
          frame_color_id: null,
          frame_color_name: `${singleName}${colorName}`,
          frame_color_price: 0,
          modules: [],
          embedded_box_id: null,
          embedded_box_name: null,
          embedded_box_price: 0,
          quantity: item.quantity,
          item_price: unitPrice,
          total_price: unitPrice * item.quantity,
        }
      }

      const framePrice = getFrameColorPrice(item.frame_color, item.gang_count)
      const modulesPrice = item.modules.reduce((s, m) => s + m.module_price, 0)
      const boxPrice = item.embedded_box?.price ?? 0
      const boxQuantity = item.embedded_box ? (item.embedded_box_quantity ?? 1) : 0
      const setUnitPrice = framePrice + modulesPrice
      const boxTotal = boxPrice * boxQuantity

      return {
        order_id: createdOrder.id,
        gang_count: item.gang_count,
        frame_color_id: item.frame_color.id,
        frame_color_name: item.frame_color.name,
        frame_color_price: framePrice,
        modules: item.modules,
        embedded_box_id: item.embedded_box?.id ?? null,
        embedded_box_name: item.embedded_box
          ? `${item.embedded_box.name} x${boxQuantity}`
          : null,
        embedded_box_price: boxPrice,
        quantity: item.quantity,
        item_price: setUnitPrice,
        total_price: setUnitPrice * item.quantity + boxTotal,
      }
    })

    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) throw itemsError

    const quoteUrl = `${getQuoteBaseUrl(req)}/quotes/${quoteToken}`
    const alimtalkSent = await sendQuoteAlimtalk({
      to: session.phone,
      quoteUrl,
    })

    return NextResponse.json({
      success: true,
      orderNumber: createdOrder.order_number,
      quoteUrl,
      quoteToken,
      alimtalkSent,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '견적 접수에 실패했습니다.' }, { status: 500 })
  }
}
