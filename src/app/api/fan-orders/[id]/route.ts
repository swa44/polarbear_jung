import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

function getSession(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const raw = cookieStore.get('customer_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { name: string; phone: string } } catch { return null }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const session = getSession(cookieStore)
    if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: order } = await supabase
      .from('fan_orders')
      .select('id, status, customer_phone')
      .eq('id', id)
      .single()

    if (!order || order.customer_phone !== session.phone)
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    if (['paid', 'shipped'].includes(order.status))
      return NextResponse.json({ error: '취소할 수 없는 상태입니다.' }, { status: 400 })

    await supabase.from('fan_orders').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '취소에 실패했습니다.' }, { status: 500 })
  }
}
