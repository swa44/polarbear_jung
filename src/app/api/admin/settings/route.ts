import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

function checkAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore.get('admin_session')?.value === 'true'
}

export async function GET() {
  const supabase = await createServiceClient()
  const { data } = await supabase.from('settings').select('*')
  const settings = Object.fromEntries((data || []).map((s) => [s.key, s.value]))
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!checkAdmin(cookieStore)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createServiceClient()

  for (const [key, value] of Object.entries(body)) {
    await supabase
      .from('settings')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() })
  }

  return NextResponse.json({ success: true })
}

// 관리자 로그인
export async function PUT(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8시간
    path: '/',
  })

  return NextResponse.json({ success: true })
}
