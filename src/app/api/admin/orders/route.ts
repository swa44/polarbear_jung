import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ORDER_STATUS_LABEL } from '@/lib/utils'
import { checkAdminAuth } from '@/lib/admin-auth'
import { sendShippingAlimtalk } from '@/lib/alimtalk'

type OrderModule = {
  module_name: string
}

type OrderItemForExport = {
  gang_count: number
  quantity: number
  frame_color_name: string
  modules: OrderModule[]
  embedded_box_name?: string | null
}

type OrderForExport = {
  id: string
  order_number: string
  created_at: string
  customer_name: string
  customer_phone: string
  recipient_name: string | null
  recipient_phone: string | null
  shipping_address: string
  shipping_detail: string | null
  status: string
  total_price: number
  tracking_company: string | null
  tracking_number: string | null
  order_items?: OrderItemForExport[]
}

type BomRow = {
  productName: string
  color: string
  itemCode: string
  itemName: string
}

export async function GET(req: NextRequest) {
  try {
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const format = searchParams.get('format')
    const idsParam = searchParams.get('ids')
    const ids = idsParam
      ? idsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : []

    const supabase = createServiceClient()
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (ids.length > 0) {
      query = query.in('id', ids)
    }

    const { data, error } = await query
    if (error) throw error

    // CSV 다운로드
    if (format === 'csv') {
      const csv = generateCsv((data || []) as OrderForExport[])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }
    if (format === 'picking_csv') {
      const bomRows = await readPickingBomMapFromDb()
      const csv = generatePickingCsv((data || []) as OrderForExport[], bomRows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="picking_${new Date().toISOString().slice(0, 10)}.csv"`,
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
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const { id, status, tracking_number, tracking_company, admin_memo } = await req.json()

    const supabase = createServiceClient()
    const updateData: Record<string, unknown> = {}

    if (status) updateData.status = status
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number
    if (tracking_company !== undefined) updateData.tracking_company = tracking_company
    if (admin_memo !== undefined) updateData.admin_memo = admin_memo
    if (status === 'paid') updateData.paid_at = new Date().toISOString()
    if (status === 'shipped') updateData.shipped_at = new Date().toISOString()
    if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('*, order_items(*)')
      .single()

    if (error) throw error

    if (status === 'shipped' && data.customer_phone && data.quote_token) {
      const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
        || `${req.headers.get('x-forwarded-proto') ?? 'https'}://${req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''}`
      const quoteUrl = `${siteBase}/quotes/${data.quote_token}`
      sendShippingAlimtalk({
        to: data.customer_phone,
        trackingCompany: tracking_company ?? '',
        trackingNumber: tracking_number ?? '',
        quoteUrl,
      }).catch((e) => console.error('[Shipping alimtalk error]', e))
    }

    return NextResponse.json({ success: true, order: data })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

function generateCsv(orders: OrderForExport[]): string {
  const BOM = '\uFEFF'
  const headers = [
    '견적번호', '요청일시', '고객명', '연락처', '수신인', '수신연락처', '배송지', '상세주소',
    '상태', '합계금액', '택배사', '송장번호', '상품내역',
  ]

  const rows = orders.map((o) => {
    const items = (o.order_items || [])
      .map((item) => {
        const modules = item.modules.map((m) => m.module_name).join('+')
        return `${item.gang_count}구[${item.frame_color_name}](${modules})x${item.quantity}`
      })
      .join(' / ')

    return [
      o.order_number,
      new Date(o.created_at).toLocaleString('ko-KR'),
      o.customer_name,
      o.customer_phone,
      o.recipient_name || o.customer_name,
      o.recipient_phone || o.customer_phone,
      o.shipping_address,
      o.shipping_detail || '',
      ORDER_STATUS_LABEL[o.status] || o.status,
      o.total_price,
      o.tracking_company || '',
      o.tracking_number || '',
      items,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  })

  return BOM + [headers.join(','), ...rows].join('\n')
}

async function readPickingBomMapFromDb(): Promise<BomRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('module_parts')
    .select('module_name, color_name, part_code, part_name')
    .eq('is_active', true)

  if (error) throw error
  if (!data || data.length === 0) throw new Error('module_parts 데이터가 없습니다. BOM CSV를 먼저 업로드해주세요.')

  return data.map((p) => ({
    productName: p.module_name,
    color: p.color_name ?? '',
    itemCode: p.part_code,
    itemName: p.part_name,
  }))
}

function generatePickingCsv(orders: OrderForExport[], bomRows: BomRow[]): string {
  const BOM = '\uFEFF'
  // 상품명 기준 맵 (세트 모듈 / 박스 / 프레임 조회용)
  const map = new Map<string, BomRow[]>()
  // 제품명 기준 맵 (인서트/커버 등 낱개 part 조회용)
  const itemNameMap = new Map<string, BomRow[]>()
  for (const row of bomRows) {
    const key = buildBomKey(row.productName, row.color)
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)

    const nameKey = buildBomKey(row.itemName, row.color)
    const nameList = itemNameMap.get(nameKey) ?? []
    nameList.push(row)
    itemNameMap.set(nameKey, nameList)
  }

  const aggregate = new Map<
    string,
    {
      itemCode: string
      itemName: string
      color: string
      totalQty: number
      orders: Set<string>
    }
  >()
  const unmatched = new Set<string>()

  const addToAggregate = (
    lookupName: string,
    color: string,
    qty: number,
    orderNumber: string,
  ) => {
    const bomKey = buildBomKey(lookupName, color)
    const mapped = map.get(bomKey)
    if (!mapped || mapped.length === 0) {
      unmatched.add(`${lookupName} / ${color}`)
      return
    }
    for (const part of mapped) {
      const key = `${part.itemCode}||${part.itemName}||${part.color}`
      const current = aggregate.get(key) ?? {
        itemCode: part.itemCode,
        itemName: part.itemName,
        color: part.color,
        totalQty: 0,
        orders: new Set<string>(),
      }
      current.totalQty += qty
      current.orders.add(orderNumber)
      aggregate.set(key, current)
    }
  }

  const addPartRowDirect = (
    part: BomRow,
    qty: number,
    orderNumber: string,
  ) => {
    const key = `${part.itemCode}||${part.itemName}||${part.color}`
    const current = aggregate.get(key) ?? {
      itemCode: part.itemCode,
      itemName: part.itemName,
      color: part.color,
      totalQty: 0,
      orders: new Set<string>(),
    }
    current.totalQty += qty
    current.orders.add(orderNumber)
    aggregate.set(key, current)
  }

  const addByItemName = (
    lookupItemName: string,
    color: string,
    qty: number,
    orderNumber: string,
  ): boolean => {
    const key = buildBomKey(lookupItemName, color)
    const mapped = itemNameMap.get(key)
    if (!mapped || mapped.length === 0) return false
    for (const part of mapped) {
      // 제품명 매핑은 해당 품목코드 1:1로 직접 집계
      addPartRowDirect(part, qty, orderNumber)
    }
    return true
  }

  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      const isSingle = !item.modules || item.modules.length === 0

      if (isSingle) {
        // 낱개는 제품명(품목코드 1:1)만 허용.
        // 세트용 상품명 확장 매핑을 타면 인서트 주문 시 커버까지 함께 집계될 수 있어 금지한다.
        if (addByItemName(item.frame_color_name, '', item.quantity, order.order_number)) {
          // matched by itemName
        } else {
          // 색상이 괄호로 붙은 경우: "제품명 (색상)" → 상품명/색상 분리
          // 예) "인서트 로터리디밍 (라이트그레이)"
          const colorMatch = item.frame_color_name.match(/^(.*?)\s+\(([^)]+)\)\s*$/)
          if (colorMatch) {
            const pName = colorMatch[1].trim()
            const pColor = colorMatch[2].trim()
            if (addByItemName(pName, pColor, item.quantity, order.order_number)) {
              // 제품명 1:1 매핑 우선
            } else if (addByItemName(pName, '', item.quantity, order.order_number)) {
              // BOM 색상값이 비어있는 단품(예: 매립박스) 대응
            } else {
              unmatched.add(item.frame_color_name)
            }
          } else {
            // 괄호 없는 경우도 제품명 1:1만 허용
            if (addByItemName(item.frame_color_name, '', item.quantity, order.order_number)) {
              // 제품명 매핑 성공
            } else {
              unmatched.add(item.frame_color_name)
            }
          }
        }
      } else {
        // 세트: 각 모듈별로 색상 키 추출 후 조회
        const colorKey = extractColorKey(item.frame_color_name)

        // 세트 프레임(1~5구) 집계
        addToAggregate(`${item.gang_count}구`, colorKey, item.quantity, order.order_number)

        // 세트 모듈 집계
        for (const mod of item.modules) {
          addToAggregate(mod.module_name, colorKey, item.quantity, order.order_number)
        }

        // 세트 추가상품(매립박스) 집계: order_items.embedded_box_name 포맷 "상품명 x수량"
        if (item.embedded_box_name) {
          const parsed = parseEmbeddedBoxName(item.embedded_box_name)
          if (parsed) {
            if (parsed.qty > 0) {
              addToAggregate(parsed.name, '', parsed.qty, order.order_number)
            }
          }
        }
      }
    }
  }

  const headers = ['품목코드', '제품명', '색상', '필요수량', '견적번호목록']
  const body = Array.from(aggregate.values())
    .sort((a, b) =>
      a.itemCode.localeCompare(b.itemCode) ||
      a.itemName.localeCompare(b.itemName) ||
      a.color.localeCompare(b.color)
    )
    .map((row) =>
      [
        row.itemCode,
        row.itemName,
        row.color,
        row.totalQty,
        Array.from(row.orders).sort().join(' / '),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )

  // 매핑 누락 항목은 에러 대신 CSV 하단에 표기
  const unmatchedRows = Array.from(unmatched).sort().map((label) =>
    `"[매핑누락] ${label}","","","",""`
  )

  return BOM + [headers.join(','), ...body, ...unmatchedRows].join('\n')
}

function buildBomKey(productName: string, color: string): string {
  return `${normalizeMatchText(productName)}||${normalizeMatchText(color)}`
}

function normalizeMatchText(value: string): string {
  return value.replace(/\s+/g, '').trim().toLowerCase()
}

// frame_color_name에서 BOM 색상 키 추출
// "프레임 3구 앤트러사이트 (앤트라사이트)" → "앤트라사이트"
// "화이트" → "화이트"
function extractColorKey(frameColorName: string): string {
  const match = frameColorName.match(/\(([^)]+)\)\s*$/)
  return match ? match[1].trim() : frameColorName
}

function parseEmbeddedBoxName(value: string): { name: string; qty: number } | null {
  const match = value.match(/^(.*?)\s*x(\d+)\s*$/i)
  if (!match) return null
  const qty = Number(match[2])
  return {
    name: match[1].trim(),
    qty: Number.isFinite(qty) ? qty : 0,
  }
}
