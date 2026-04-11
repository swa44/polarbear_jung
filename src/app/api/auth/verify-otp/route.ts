import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { phone, code, name } = await req.json()

    if (!phone || !code || !name) {
      return NextResponse.json({ error: '정보를 모두 입력해주세요.' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/-/g, '')
    const supabase = createServiceClient()

    const { data: otp, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !otp) {
      return NextResponse.json({ error: '인증번호가 올바르지 않거나 만료되었습니다.' }, { status: 400 })
    }

    // OTP 사용 처리
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otp.id)

    const trimmedName = name.trim()
    let fixedName = trimmedName

    const { data: existingProfile, error: profileReadError } = await supabase
      .from('customer_profiles')
      .select('name')
      .eq('phone', cleanPhone)
      .maybeSingle()

    if (profileReadError) throw profileReadError

    if (existingProfile?.name) {
      fixedName = existingProfile.name
    } else {
      const cookieStore = await cookies()
      cookieStore.set(
        'pending_customer_profile',
        JSON.stringify({ phone: cleanPhone, name: trimmedName }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 10,
          path: '/',
        }
      )

      return NextResponse.json({
        requiresNameConfirmation: true,
        name: trimmedName,
        phone: cleanPhone,
      })
    }

    // 세션 쿠키 저장
    const cookieStore = await cookies()
    const sessionData = JSON.stringify({ name: fixedName, phone: cleanPhone })
    cookieStore.set('customer_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    })

    return NextResponse.json({ success: true, name: fixedName, phone: cleanPhone })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 500 })
  }
}
