import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    const cleanPhone = String(phone || "").replace(/-/g, "").trim();

    if (!cleanPhone) {
      return NextResponse.json(
        { error: "전화번호 정보가 없습니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from("customer_profiles")
      .select("name, phone")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (error) throw error;
    if (!profile?.phone || !profile?.name) {
      return NextResponse.json(
        { error: "저장된 로그인 정보가 없습니다." },
        { status: 404 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(
      "customer_session",
      JSON.stringify({ name: profile.name, phone: profile.phone }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      },
    );

    return NextResponse.json({
      success: true,
      name: profile.name,
      phone: profile.phone,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "로그인 유지 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
