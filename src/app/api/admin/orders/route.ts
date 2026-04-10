import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notifyShipped } from '@/lib/telegram'
import { ORDER_STATUS_LABEL } from '@/lib/utils'

function checkAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore.get('admin_session')?.value === 'true'
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    if (!checkAdmin(cookieStore)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const format = searchParams.get('format')

    const supabase = await createServiceClient()
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    // CSV 다운로드
    if (format === 'csv') {
      const csv = generateCsv(data || [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({ orders: data })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    if (!checkAdmin(cookieStore)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const { id, status, tracking_number, admin_memo } = await req.json()

    const supabase = await createServiceClient()
    const updateData: Record<string, unknown> = {}

    if (status) updateData.status = status
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number
    if (admin_memo !== undefined) updateData.admin_memo = admin_memo
    if (status === 'shipped') updateData.shipped_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('*, order_items(*)')
      .single()

    if (error) throw error

    // 발송 처리 시 텔레그램 알림
    if (status === 'shipped' && data) {
      await notifyShipped(data)
    }

    return NextResponse.json({ success: true, order: data })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

function generateCsv(orders: any[]): string {
  const BOM = '\uFEFF'
  const headers = [
    '주문번호', '주문일시', '고객명', '연락처', '배송지', '상세주소',
    '상태', '합계금액', '송장번호', '상품내역',
  ]

  const rows = orders.map((o) => {
    const items = (o.order_items || [])
      .map((item: any) => {
        const modules = item.modules.map((m: any) => m.module_name).join('+')
        return `${item.gang_count}구[${item.frame_color_name}](${modules})x${item.quantity}`
      })
      .join(' / ')

    return [
      o.order_number,
      new Date(o.created_at).toLocaleString('ko-KR'),
      o.customer_name,
      o.customer_phone,
      o.shipping_address,
      o.shipping_detail || '',
      ORDER_STATUS_LABEL[o.status] || o.status,
      o.total_price,
      o.tracking_number || '',
      items,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  })

  return BOM + [headers.join(','), ...rows].join('\n')
}
