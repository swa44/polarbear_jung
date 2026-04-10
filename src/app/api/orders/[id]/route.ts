import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
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

// 주문 수정 (pending 상태에서만)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const session = getSession(cookieStore)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createServiceClient()

    // 본인 주문 & pending 상태 확인
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_phone', session.phone)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 주문은 수정할 수 없습니다.' }, { status: 400 })
    }

    const { cartItems, shippingAddress, shippingDetail } = await req.json() as {
      cartItems: CartItem[]
      shippingAddress: string
      shippingDetail?: string
    }

    const totalPrice = cartItems.reduce((sum, item) => {
      const framePrice = item.frame_color.price
      const modulesPrice = item.modules.reduce((s, m) => s + m.module_price, 0)
      const boxPrice = item.embedded_box?.price ?? 0
      return sum + (framePrice + modulesPrice + boxPrice) * item.quantity
    }, 0)

    // 기존 상품 삭제 후 재삽입
    await supabase.from('order_items').delete().eq('order_id', id)

    const items = cartItems.map((item) => {
      const modulesPrice = item.modules.reduce((s, m) => s + m.module_price, 0)
      const boxPrice = item.embedded_box?.price ?? 0
      const itemPrice = item.frame_color.price + modulesPrice + boxPrice
      return {
        order_id: id,
        gang_count: item.gang_count,
        frame_color_id: item.frame_color.id,
        frame_color_name: item.frame_color.name,
        frame_color_price: item.frame_color.price,
        modules: item.modules,
        embedded_box_id: item.embedded_box?.id ?? null,
        embedded_box_name: item.embedded_box?.name ?? null,
        embedded_box_price: boxPrice,
        quantity: item.quantity,
        item_price: itemPrice,
        total_price: itemPrice * item.quantity,
      }
    })

    await supabase.from('order_items').insert(items)
    await supabase
      .from('orders')
      .update({ shipping_address: shippingAddress, shipping_detail: shippingDetail || null, total_price: totalPrice })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

// 주문 취소 (pending 상태에서만)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const session = getSession(cookieStore)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createServiceClient()

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_phone', session.phone)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 주문은 취소할 수 없습니다.' }, { status: 400 })
    }

    await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '취소에 실패했습니다.' }, { status: 500 })
  }
}
