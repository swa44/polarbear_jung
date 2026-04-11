import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

type PendingProfile = {
  phone: string;
  name: string;
};

function getPendingProfile(raw: string | undefined): PendingProfile | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingProfile;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const trimmedName = String(name || "").trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: "이름을 입력해주세요." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const pending = getPendingProfile(
      cookieStore.get("pending_customer_profile")?.value,
    );

    if (!pending?.phone) {
      return NextResponse.json(
        { error: "이름 확인 세션이 만료되었습니다. 다시 로그인해주세요." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: existingProfile, error: readError } = await supabase
      .from("customer_profiles")
      .select("name")
      .eq("phone", pending.phone)
      .maybeSingle();

    if (readError) throw readError;

    const fixedName = existingProfile?.name || trimmedName;

    if (!existingProfile?.name) {
      const { error: insertError } = await supabase.from("customer_profiles").insert({
        phone: pending.phone,
        name: fixedName,
      });

      if (insertError) throw insertError;
    }

    cookieStore.set(
      "customer_session",
      JSON.stringify({ name: fixedName, phone: pending.phone }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      },
    );

    cookieStore.set("pending_customer_profile", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      name: fixedName,
      phone: pending.phone,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "이름 확인 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
