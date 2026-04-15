import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

function getSession(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const raw = cookieStore.get('customer_session')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as { name: string; phone: string }
  } catch {
    return null
  }
}

const CANCELLABLE_STATUSES = ['quoted', 'shipping_info_submitted', 'waiting_deposit']

// 견적 취소
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const session = getSession(cookieStore)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_phone', session.phone)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: '견적을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json({ error: '이미 처리된 견적은 취소할 수 없습니다.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '취소에 실패했습니다.' }, { status: 500 })
  }
}
