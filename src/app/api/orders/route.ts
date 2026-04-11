import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { generateOrderNumber } from '@/lib/utils'
import { notifyNewOrder } from '@/lib/telegram'
import { CartItem } from '@/types'
import { getFrameColorPrice } from '@/lib/utils'

function getSession(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const raw = cookieStore.get('customer_session')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as { name: string; phone: string }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
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

    const { cartItems, shippingAddress, shippingDetail } = await req.json() as {
      cartItems: CartItem[]
      shippingAddress: string
      shippingDetail?: string
    }

    if (!cartItems?.length || !shippingAddress) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 })
    }

    // 총액 계산
    const totalPrice = cartItems.reduce((sum, item) => {
      const framePrice = getFrameColorPrice(item.frame_color, item.gang_count)
      const modulesPrice = item.modules.reduce((s, m) => s + m.module_price, 0)
      const boxPrice = item.embedded_box?.price ?? 0
      return sum + (framePrice + modulesPrice + boxPrice) * item.quantity
    }, 0)

    const supabase = createServiceClient()
    const orderNumber = generateOrderNumber()

    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: session.name,
        customer_phone: session.phone,
        shipping_address: shippingAddress,
        shipping_detail: shippingDetail || null,
        total_price: totalPrice,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 주문 상품 생성
    const items = cartItems.map((item) => {
      const framePrice = getFrameColorPrice(item.frame_color, item.gang_count)
      const modulesPrice = item.modules.reduce((s, m) => s + m.module_price, 0)
      const boxPrice = item.embedded_box?.price ?? 0
      const itemPrice = framePrice + modulesPrice + boxPrice

      return {
        order_id: order.id,
        gang_count: item.gang_count,
        frame_color_id: item.frame_color.id,
        frame_color_name: item.frame_color.name,
        frame_color_price: framePrice,
        modules: item.modules,
        embedded_box_id: item.embedded_box?.id ?? null,
        embedded_box_name: item.embedded_box?.name ?? null,
        embedded_box_price: boxPrice,
        quantity: item.quantity,
        item_price: itemPrice,
        total_price: itemPrice * item.quantity,
      }
    })

    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) throw itemsError

    // 텔레그램 알림
    const fullOrder = { ...order, order_items: items as any }
    await notifyNewOrder(fullOrder)

    return NextResponse.json({ success: true, orderNumber: order.order_number })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '주문 접수에 실패했습니다.' }, { status: 500 })
  }
}
