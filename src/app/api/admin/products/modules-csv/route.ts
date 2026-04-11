import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin-auth'

type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

type ModuleCsvRow = {
  name: string
  category: '스위치류' | '콘센트류' | '기타류'
  price: number
  max_gang: number | null
  sort_order: number
  is_active: boolean
}

const REQUIRED_HEADERS = ['name', 'category', 'price', 'max_gang', 'sort_order', 'is_active']
const ALLOWED_CATEGORIES = new Set(['스위치류', '콘센트류', '기타류'])

export async function POST(req: NextRequest) {
  try {
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const formData = await req.formData()
    const frameColorId = String(formData.get('frame_color_id') || '').trim()
    const file = formData.get('file')

    if (!frameColorId) {
      return NextResponse.json({ error: '프레임 색상 정보가 누락되었습니다.' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CSV 파일이 필요합니다.' }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseCsv(text)
    const headerErrors = validateHeaders(parsed.headers)
    if (headerErrors.length > 0) {
      return NextResponse.json(
        { error: 'CSV 헤더가 올바르지 않습니다.', details: headerErrors },
        { status: 400 }
      )
    }
    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: 'CSV 데이터 행이 없습니다.' }, { status: 400 })
    }

    const validation = validateRows(parsed.rows)
    if (validation.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV 검증에 실패했습니다. (전체 반영 취소)', details: validation.errors },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data: frameColor, error: frameError } = await supabase
      .from('frame_colors')
      .select('id')
      .eq('id', frameColorId)
      .single()

    if (frameError || !frameColor) {
      return NextResponse.json({ error: '대상 프레임 색상을 찾을 수 없습니다.' }, { status: 400 })
    }

    const { data: existingModules, error: existingError } = await supabase
      .from('modules')
      .select('*')
      .eq('frame_color_id', frameColorId)

    if (existingError) {
      return NextResponse.json({ error: '기존 모듈 조회에 실패했습니다.' }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from('modules')
      .delete()
      .eq('frame_color_id', frameColorId)

    if (deleteError) {
      return NextResponse.json({ error: '기존 모듈 삭제에 실패했습니다.' }, { status: 500 })
    }

    const insertRows = validation.rows.map((row) => ({
      frame_color_id: frameColorId,
      name: row.name,
      category: row.category,
      price: row.price,
      max_gang: row.max_gang,
      sort_order: row.sort_order,
      is_active: row.is_active,
      image_url: null as string | null,
    }))

    const { error: insertError } = await supabase.from('modules').insert(insertRows)
    if (insertError) {
      if (existingModules && existingModules.length > 0) {
        const restoreRows = existingModules.map((module) => ({
          frame_color_id: module.frame_color_id,
          name: module.name,
          category: module.category,
          price: module.price,
          image_url: module.image_url,
          max_gang: module.max_gang,
          is_active: module.is_active,
          sort_order: module.sort_order,
        }))
        await supabase.from('modules').insert(restoreRows)
      }
      return NextResponse.json(
        { error: 'CSV 반영에 실패했습니다. 기존 데이터를 복구했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      inserted: insertRows.length,
      message: `모듈 ${insertRows.length}개를 CSV 기준으로 교체했습니다.`,
    })
  } catch (error) {
    console.error('[modules-csv POST]', error)
    return NextResponse.json({ error: 'CSV 업로드 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

function validateHeaders(headers: string[]): string[] {
  const normalized = headers.map((h) => h.trim())
  if (normalized.length !== REQUIRED_HEADERS.length) {
    return [`헤더 개수가 다릅니다. 기대값: ${REQUIRED_HEADERS.join(',')}`]
  }

  const mismatches = REQUIRED_HEADERS.filter((header, index) => normalized[index] !== header)
  if (mismatches.length > 0) {
    return [`헤더 순서/값이 일치해야 합니다. 기대값: ${REQUIRED_HEADERS.join(',')}`]
  }
  return []
}

function validateRows(rows: string[][]): { rows: ModuleCsvRow[]; errors: string[] } {
  const errors: string[] = []
  const parsedRows: ModuleCsvRow[] = []

  rows.forEach((cols, idx) => {
    const line = idx + 2
    if (cols.length !== REQUIRED_HEADERS.length) {
      errors.push(`${line}행: 컬럼 개수가 ${REQUIRED_HEADERS.length}개가 아닙니다.`)
      return
    }

    const name = cols[0].trim()
    const category = cols[1].trim()
    const priceRaw = cols[2].trim()
    const maxGangRaw = cols[3].trim()
    const sortOrderRaw = cols[4].trim()
    const isActiveRaw = cols[5].trim().toLowerCase()

    if (!name) {
      errors.push(`${line}행: name은 필수입니다.`)
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      errors.push(`${line}행: category는 스위치류/콘센트류/기타류 중 하나여야 합니다.`)
    }

    const price = Number(priceRaw)
    if (!Number.isInteger(price) || price < 0) {
      errors.push(`${line}행: price는 0 이상의 정수여야 합니다.`)
    }

    let maxGang: number | null = null
    if (maxGangRaw !== '') {
      const parsedMaxGang = Number(maxGangRaw)
      if (!Number.isInteger(parsedMaxGang) || parsedMaxGang < 1 || parsedMaxGang > 5) {
        errors.push(`${line}행: max_gang은 빈칸 또는 1~5 정수여야 합니다.`)
      } else {
        maxGang = parsedMaxGang
      }
    }

    const sortOrder = Number(sortOrderRaw)
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      errors.push(`${line}행: sort_order는 0 이상의 정수여야 합니다.`)
    }

    let isActive: boolean
    if (isActiveRaw === 'true' || isActiveRaw === '1') {
      isActive = true
    } else if (isActiveRaw === 'false' || isActiveRaw === '0') {
      isActive = false
    } else {
      errors.push(`${line}행: is_active는 true/false 또는 1/0만 허용됩니다.`)
      isActive = true
    }

    parsedRows.push({
      name,
      category: category as ModuleCsvRow['category'],
      price: Number.isInteger(price) ? price : 0,
      max_gang: maxGang,
      sort_order: Number.isInteger(sortOrder) ? sortOrder : 0,
      is_active: isActive,
    })
  })

  if (errors.length > 0) return { rows: [], errors }
  return { rows: parsedRows, errors: [] }
}

function parseCsv(content: string): ParsedCsv {
  const cleaned = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleaned.split('\n').filter((line) => line.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map(parseCsvLine)

  return { headers, rows }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(current)
      current = ''
      continue
    }
    current += ch
  }
  out.push(current)
  return out
}
