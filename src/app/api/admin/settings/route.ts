import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('*')
  const settings = Object.fromEntries((data || []).map((s) => [s.key, s.value]))
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = createServiceClient()

  for (const [key, value] of Object.entries(body)) {
    await supabase
      .from('settings')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() })
  }

  return NextResponse.json({ success: true })
}
