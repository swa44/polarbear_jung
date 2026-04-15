import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ORDER_STATUS_LABEL } from '@/lib/utils'
import { checkAdminAuth } from '@/lib/admin-auth'
import { readFile } from 'fs/promises'
import path from 'path'

type OrderModule = {
  module_name: string
}

type OrderItemForExport = {
  gang_count: number
  quantity: number
  frame_color_name: string
  modules: OrderModule[]
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
      const bomRows = await readPickingBomMap()
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

async function readPickingBomMap(): Promise<BomRow[]> {
  const csvPath = path.join(process.cwd(), 'picking_bom_map.csv')
  const raw = await readFile(csvPath, 'utf8')
  const rows = parseCsv(raw)

  // 첫 번째 행이 병합 헤더(Column1, Column2...)인 경우 건너뜀
  // 실제 컬럼명(상품명, 재질, 색상...)이 있는 행을 헤더로 사용
  let headerRowIdx = 0
  for (let i = 0; i < Math.min(rows.length, 3); i += 1) {
    if (rows[i].map((v) => v.trim()).includes('상품명')) {
      headerRowIdx = i
      break
    }
  }

  if (rows.length <= headerRowIdx + 1) {
    throw new Error('picking_bom_map.csv에 데이터가 없습니다.')
  }

  const header = rows[headerRowIdx].map((v) => v.trim())
  const colProductName = header.indexOf('상품명')
  const colColor = header.indexOf('색상')
  const colItemCode = header.indexOf('품목코드')
  const colItemName = header.indexOf('제품명')

  if (colProductName === -1 || colColor === -1 || colItemCode === -1 || colItemName === -1) {
    throw new Error(
      `picking_bom_map.csv에 필수 컬럼이 없습니다. 필요: 상품명, 색상, 품목코드, 제품명`
    )
  }

  const bomRows: BomRow[] = []
  for (let i = headerRowIdx + 1; i < rows.length; i += 1) {
    const cols = rows[i].map((v) => v.trim())
    const productName = cols[colProductName] ?? ''
    const color = cols[colColor] ?? ''
    const itemCode = cols[colItemCode] ?? ''
    const itemName = cols[colItemName] ?? ''
    if (!productName || !color || !itemCode || !itemName) continue
    bomRows.push({ productName, color, itemCode, itemName })
  }

  if (bomRows.length === 0) {
    throw new Error('picking_bom_map.csv에 유효한 데이터 행이 없습니다.')
  }

  return bomRows
}

function generatePickingCsv(orders: OrderForExport[], bomRows: BomRow[]): string {
  const BOM = '\uFEFF'
  const map = new Map<string, BomRow[]>()
  for (const row of bomRows) {
    const key = buildBomKey(row.productName, row.color)
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }

  const aggregate = new Map<
    string,
    { itemCode: string; itemName: string; totalQty: number; orders: Set<string> }
  >()
  const unmatched = new Set<string>()

  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      for (const mod of item.modules ?? []) {
        const bomKey = buildBomKey(mod.module_name, item.frame_color_name)
        const mapped = map.get(bomKey)
        if (!mapped || mapped.length === 0) {
          unmatched.add(`${mod.module_name} / ${item.frame_color_name}`)
          continue
        }

        for (const part of mapped) {
          const key = `${part.itemCode}||${part.itemName}`
          const current = aggregate.get(key) ?? {
            itemCode: part.itemCode,
            itemName: part.itemName,
            totalQty: 0,
            orders: new Set<string>(),
          }
          current.totalQty += item.quantity
          current.orders.add(order.order_number)
          aggregate.set(key, current)
        }
      }
    }
  }

  if (unmatched.size > 0) {
    throw new Error(
      `피킹 매핑 누락: ${Array.from(unmatched).slice(0, 20).join(', ')}`
    )
  }

  const headers = ['품목코드', '제품명', '필요수량', '견적번호목록']
  const body = Array.from(aggregate.values())
    .sort((a, b) => a.itemCode.localeCompare(b.itemCode))
    .map((row) =>
      [
        row.itemCode,
        row.itemName,
        row.totalQty,
        Array.from(row.orders).sort().join(' / '),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )

  return BOM + [headers.join(','), ...body].join('\n')
}

function buildBomKey(productName: string, color: string): string {
  return `${normalizeMatchText(productName)}||${normalizeMatchText(color)}`
}

function normalizeMatchText(value: string): string {
  return value.replace(/\s+/g, '').trim().toLowerCase()
}

function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(current)
      const hasData = row.some((cell) => cell.trim() !== '')
      if (hasData) rows.push(row)
      row = []
      current = ''
      continue
    }

    current += ch
  }

  row.push(current)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}
