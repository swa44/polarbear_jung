import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import JungImageBanner from "@/components/ui/JungImageBanner";
import LucciairImageBanner from "@/components/ui/LucciairImageBanner";

export default async function SelectPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("customer_session")?.value;
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold text-gray-900">
            실시간 견적을 원하시는<br></br>제품을 선택해주세요.
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/jung/build"
            className="bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden flex flex-col active:bg-gray-50 transition-colors"
          >
            <JungImageBanner />
            <div className="p-3 flex flex-col gap-0.5">
              <p className="text-sm font-bold text-gray-900">JUNG 스위치</p>
              <p className="text-xs text-gray-500">스위치 세트 견적</p>
            </div>
          </Link>

          <Link
            href="/lucciair/build"
            className="bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden flex flex-col active:bg-gray-50 transition-colors"
          >
            <LucciairImageBanner />
            <div className="p-3 flex flex-col gap-0.5">
              <p className="text-sm font-bold text-gray-900">LUCCIAIR 실링팬</p>
              <p className="text-xs text-gray-500">실링팬 견적</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
