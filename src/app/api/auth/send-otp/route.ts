import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ""))) {
      return NextResponse.json(
        { error: "올바른 전화번호를 입력해주세요." },
        { status: 400 },
      );
    }

    const cleanPhone = phone.replace(/-/g, "");
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분

    const supabase = createServiceClient();

    // 기존 미인증 OTP 삭제
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("phone", cleanPhone)
      .eq("verified", false);

    // 새 OTP 저장
    const { error } = await supabase.from("otp_verifications").insert({
      phone: cleanPhone,
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw error;

    // SMS 발송
    await sendSms(
      cleanPhone,
      `[폴라베어] 융스위치 견적 시스템 인증번호: ${code} (3분 이내 입력)`,
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "인증번호 발송에 실패했습니다." },
      { status: 500 },
    );
  }
}

async function sendSms(phone: string, message: string): Promise<void> {
  const apiUrl = process.env.BIZGO_API_URL;
  const apiKey = process.env.BIZGO_API_KEY;
  const sender = process.env.SMS_SENDER_NUMBER;

  if (!apiUrl || !apiKey || !sender) {
    // 개발 환경: 콘솔 출력
    console.log(`[SMS Dev] To: ${phone}, Message: ${message}`);
    return;
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      messageFlow: [{ sms: { from: sender, text: message } }],
      destinations: [{ to: phone }],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("SMS API 발송 실패:", {
      status: res.status,
      error: errorData,
    });
    throw new Error("SMS 발송 실패");
  }
}
