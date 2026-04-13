import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { applyCsvPricesToProducts, readPricePartsMap } from '@/lib/price-parts'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const [colors, modules, boxes, priceMap] = await Promise.all([
      supabase.from('frame_colors').select('*').order('sort_order'),
      supabase.from('modules').select('*').order('sort_order'),
      supabase.from('embedded_boxes').select('*').order('sort_order'),
      readPricePartsMap(),
    ])

    const merged = applyCsvPricesToProducts(
      colors.data ?? [],
      modules.data ?? [],
      boxes.data ?? [],
      priceMap,
    )

    return NextResponse.json(merged)
  } catch (e) {
    console.error('[products GET]', e)
    return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const { table, data } = await req.json()
    if (!['frame_colors', 'modules', 'embedded_boxes'].includes(table)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: result, error } = await supabase.from(table).insert(data).select().single()
    if (error) {
      console.error('[products POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e: any) {
    console.error('[products POST catch]', e)
    return NextResponse.json({ error: e?.message || '추가에 실패했습니다.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const { table, id, data } = await req.json()
    if (!['frame_colors', 'modules', 'embedded_boxes'].includes(table)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from(table).update(data).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!await checkAdminAuth()) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
    }

    const { table, id } = await req.json()
    if (!['frame_colors', 'modules', 'embedded_boxes'].includes(table)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }
}
