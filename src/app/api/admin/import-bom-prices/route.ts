import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin-auth'

const FRAME_NAMES = new Set(['1구', '2구', '3구', '4구', '5구'])
const BOX_CATEGORY_NAME = '매립박스'

function normalizeName(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '').trim().toLowerCase()
}

function getCodeFromImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  const match = imageUrl.match(/\/boxes\/(.+)\.webp$/i)
  return match?.[1] ?? null
}

function normalizeMaterial(val: string | undefined): string | null {
  if (!val) return null
  const v = val.trim().toLowerCase()
  if (v === 'plastic' || v.includes('플라스틱')) return 'plastic'
  if (v === 'metal' || v.includes('메탈')) return 'metal'
  return val.trim() || null
}

function normalizeMaterialKey(val: string | null | undefined): string {
  const normalized = normalizeMaterial(val ?? undefined)
  return normalizeName(normalized ?? val ?? '')
}

interface BomRow {
  상품명: string
  색상: string
  품목코드: string
  제품명: string
  단가: number
  카테고리?: string
  재질?: string
}

function parseCSV(text: string): BomRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  // 실제 헤더 행 찾기 (상품명이 포함된 행)
  const headerIdx = lines.findIndex((l) => l.includes('상품명'))
  if (headerIdx === -1) return []

  const headers = lines[headerIdx].split(',').map((h) => h.trim())
  const rows: BomRow[] = []

  for (const line of lines.slice(headerIdx + 1)) {
    if (!line.trim()) continue

    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())

    const obj = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
    const price = Number(String(obj['단가'] ?? '').replace(/[^0-9]/g, '')) || 0

    if (!obj['상품명'] || !obj['품목코드']) continue

    rows.push({
      상품명: obj['상품명'],
      색상: obj['색상'] ?? '',
      품목코드: obj['품목코드'],
      제품명: obj['제품명'] ?? '',
      단가: price,
      카테고리: obj['카테고리'] ?? '',
      재질: obj['재질'] ?? '',
    })
  }

  return rows
}

export async function POST(req: NextRequest) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'CSV 파일이 없습니다.' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: 'CSV 데이터가 없습니다.' }, { status: 400 })

  const supabase = createServiceClient()

  // ── 색상명 → ID 맵 ──────────────────────────────────────────
  const { data: colors, error: colorErr } = await supabase
    .from('frame_colors').select('id, name')
  if (colorErr) throw colorErr
  const colorIdMap = new Map(colors.map((c) => [c.name, c.id]))

  // ── 매립박스 이름 목록 ─────────────────────────────────────
  const { data: boxes, error: boxErr } = await supabase
    .from('embedded_boxes').select('id, name, image_url, sort_order')
  if (boxErr) throw boxErr
  const boxNameMap = new Map(boxes.map((b) => [b.name, b.id]))
  const boxNameNormalizedMap = new Map(boxes.map((b) => [normalizeName(b.name), b.id]))
  const boxImageUrlMap = new Map(boxes.map((b) => [b.id, b.image_url]))
  const boxCodeMap = new Map(
    boxes
      .map((b) => [getCodeFromImageUrl(b.image_url), b.id] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0])),
  )
  let nextBoxSortOrder =
    boxes.reduce((max, box) => Math.max(max, box.sort_order ?? 0), 0) + 1

  const frameRows = rows.filter((r) => FRAME_NAMES.has(r.상품명))
  const boxRows = rows.filter((r) => r.카테고리 === BOX_CATEGORY_NAME)
  const moduleRows = rows.filter(
    (r) => !FRAME_NAMES.has(r.상품명) && r.카테고리 !== BOX_CATEGORY_NAME,
  )

  let framesUpdated = 0
  let boxesUpdated = 0
  let partsUpserted = 0
  const notFound: string[] = []

  // ── 1. 프레임 가격 업데이트 (frame_colors.price_1~5) ──────────
  // 색상별로 묶기
  const frameByColor = new Map<string, Map<number, number>>()
  for (const r of frameRows) {
    const gang = parseInt(r.상품명)
    if (!frameByColor.has(r.색상)) frameByColor.set(r.색상, new Map())
    frameByColor.get(r.색상)!.set(gang, r.단가)
  }

  for (const [colorName, gangPrices] of frameByColor.entries()) {
    const colorId = colorIdMap.get(colorName)
    if (!colorId) { notFound.push(`색상 없음: ${colorName}`); continue }

    const update: Record<string, number> = {}
    for (const [gang, price] of gangPrices.entries()) {
      update[`price_${gang}`] = price
    }

    const { error } = await supabase
      .from('frame_colors').update(update).eq('id', colorId)
    if (!error) framesUpdated++
    else notFound.push(`프레임 업데이트 실패: ${colorName}`)
  }

  // ── 2. 매립박스 상품명 + 단가 + 이미지 업데이트 ───────────────
  for (const r of boxRows) {
    const normalizedName = normalizeName(r.상품명)
    const normalizedProductName = normalizeName(r.제품명)
    const fuzzyMatchedBoxId = [...boxNameNormalizedMap.entries()].find(
      ([existingNormalizedName]) =>
        existingNormalizedName === normalizedName ||
        existingNormalizedName === normalizedProductName ||
        existingNormalizedName.includes(normalizedName) ||
        normalizedName.includes(existingNormalizedName) ||
        (normalizedProductName &&
          (existingNormalizedName.includes(normalizedProductName) ||
            normalizedProductName.includes(existingNormalizedName))),
    )?.[1]

    const boxId =
      boxNameMap.get(r.상품명) ??
      boxNameNormalizedMap.get(normalizedName) ??
      boxNameNormalizedMap.get(normalizedProductName) ??
      fuzzyMatchedBoxId ??
      boxCodeMap.get(r.품목코드)

    if (!boxId) {
      const { error: insertError, data: inserted } = await supabase
        .from('embedded_boxes')
        .insert({
          name: r.상품명,
          price: r.단가,
          image_url: `/boxes/${r.품목코드}.webp`,
          is_active: true,
          sort_order: nextBoxSortOrder++,
        })
        .select('id')
        .single()

      if (insertError || !inserted) {
        notFound.push(`매립박스 생성 실패: ${r.상품명} (${r.품목코드})`)
        continue
      }

      boxNameMap.set(r.상품명, inserted.id)
      boxNameNormalizedMap.set(normalizedName, inserted.id)
      boxCodeMap.set(r.품목코드, inserted.id)
      boxesUpdated++
      continue
    }

    const { error } = await supabase
      .from('embedded_boxes')
      .update({
        name: r.상품명,
        price: r.단가,
        image_url: boxImageUrlMap.get(boxId) || `/boxes/${r.품목코드}.webp`,
      })
      .eq('id', boxId)
    if (!error) boxesUpdated++
    else notFound.push(`매립박스 업데이트 실패: ${r.상품명}`)
  }

  // ── 3. module_parts 매칭 행만 업데이트 + 없으면 추가 ────────
  const incomingPartRows = [...frameRows, ...moduleRows]
  const { data: existingParts, error: partsReadErr } = await supabase
    .from('module_parts')
    .select('id, module_name, color_name, part_code, part_name, category, material_type')
  if (partsReadErr) throw partsReadErr

  const partsPool = [...(existingParts ?? [])]
  let partsUpdated = 0
  let partsInserted = 0

  for (const r of incomingPartRows) {
    const next = {
      module_name: r.상품명,
      color_name: r.색상,
      part_code: r.품목코드,
      part_name: r.제품명,
      price: r.단가,
      category: r.카테고리 || null,
      material_type: normalizeMaterial(r.재질),
      is_active: true,
    }

    const targetColorKey = normalizeName(next.color_name)
    const targetMaterialKey = normalizeMaterialKey(next.material_type)
    const targetModuleNameKey = normalizeName(next.module_name)
    const targetPartNameKey = normalizeName(next.part_name)

    const candidates = partsPool.filter((p) => {
      const colorMatched = normalizeName(p.color_name) === targetColorKey
      const materialMatched =
        normalizeMaterialKey(p.material_type) === targetMaterialKey
      return colorMatched && materialMatched
    })

    const matchedByPartName =
      candidates.find((p) => normalizeName(p.part_name) === targetPartNameKey) ??
      null
    const moduleMatchedCandidates = candidates.filter(
      (p) => normalizeName(p.module_name) === targetModuleNameKey,
    )
    const matchedByModuleName =
      moduleMatchedCandidates.length === 1 ? moduleMatchedCandidates[0] : null
    const matchedByCode =
      candidates.find((p) => p.part_code === next.part_code) ?? null

    const matched = matchedByPartName ?? matchedByModuleName ?? matchedByCode

    if (matched) {
      const { error: updateErr } = await supabase
        .from('module_parts')
        .update(next)
        .eq('id', matched.id)
      if (updateErr) {
        notFound.push(
          `부품 업데이트 실패: ${next.module_name} / ${next.color_name} (${next.part_code})`,
        )
        continue
      }

      partsUpdated++
      const idx = partsPool.findIndex((p) => p.id === matched.id)
      if (idx !== -1) {
        partsPool[idx] = { ...partsPool[idx], ...next }
      }
      continue
    }

    const { data: insertedPart, error: insertErr } = await supabase
      .from('module_parts')
      .insert(next)
      .select('id, module_name, color_name, part_code, part_name, category, material_type')
      .single()
    if (insertErr || !insertedPart) {
      notFound.push(
        `부품 생성 실패: ${next.module_name} / ${next.color_name} (${next.part_code})`,
      )
      continue
    }

    partsPool.push(insertedPart)
    partsInserted++
  }

  partsUpserted = partsUpdated + partsInserted

  return NextResponse.json({
    framesUpdated,
    boxesUpdated,
    partsUpserted,
    partsUpdated,
    partsInserted,
    notFound,
  })
}
