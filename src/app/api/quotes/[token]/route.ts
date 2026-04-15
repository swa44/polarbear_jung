import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function getBankInfo() {
  return {
    bankName: process.env.BANK_NAME || '은행명 미설정',
    bankAccount: process.env.BANK_ACCOUNT || '계좌번호 미설정',
    bankHolder: process.env.BANK_HOLDER || '예금주 미설정',
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const supabase = createServiceClient()

    const { data: quote, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('quote_token', token)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const now = Date.now()
    const expiresAtMs = quote.quote_expires_at ? new Date(quote.quote_expires_at).getTime() : 0
    if (quote.quote_expires_at && now > expiresAtMs && quote.status !== 'paid' && quote.status !== 'shipped') {
      if (quote.status !== 'expired') {
        await supabase
          .from('orders')
          .update({ status: 'expired' })
          .eq('id', quote.id)
      }
      quote.status = 'expired'
    }

    return NextResponse.json({
      quote,
      bank: getBankInfo(),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '견적 조회에 실패했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const {
      recipientName,
      receiverPhone,
      shippingAddress,
      shippingDetail,
      shippingMemo,
    } = await req.json() as {
      recipientName?: string
      receiverPhone?: string
      shippingAddress?: string
      shippingDetail?: string
      shippingMemo?: string
    }

    if (!recipientName?.trim() || !receiverPhone?.trim() || !shippingAddress?.trim()) {
      return NextResponse.json({ error: '배송정보 필수 항목을 입력해주세요.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: quote, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, quote_expires_at')
      .eq('quote_token', token)
      .single()

    if (fetchError || !quote) {
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (quote.status === 'cancelled' || quote.status === 'expired') {
      return NextResponse.json({ error: '종료된 견적서는 배송정보를 입력할 수 없습니다.' }, { status: 400 })
    }

    const now = Date.now()
    const expiresAtMs = quote.quote_expires_at ? new Date(quote.quote_expires_at).getTime() : 0
    if (quote.quote_expires_at && now > expiresAtMs) {
      await supabase.from('orders').update({ status: 'expired' }).eq('id', quote.id)
      return NextResponse.json({ error: '견적 유효기간이 만료되었습니다.' }, { status: 400 })
    }

    const normalizedDetail = [shippingDetail?.trim(), shippingMemo?.trim()].filter(Boolean).join(' / ')

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        recipient_name: recipientName.trim(),
        recipient_phone: receiverPhone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_detail: normalizedDetail || null,
        status: 'waiting_deposit',
        shipping_submitted_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '배송정보 저장에 실패했습니다.' }, { status: 500 })
  }
}
