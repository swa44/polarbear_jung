"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/store/sessionStore";
import {
  LogOut,
  ShoppingCart,
  Package,
  Wrench,
  Boxes,
  ChevronLeft,
} from "lucide-react";

export default function LucciairShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const clearSession = useSessionStore((s) => s.clearSession);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/lucciair/build", icon: Wrench, label: "실링팬선택" },
    { href: "/lucciair/cart", icon: ShoppingCart, label: "견적바구니" },
    { href: "/lucciair/orders", icon: Package, label: "My견적" },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    router.replace("/login");
    router.refresh();
  };

  const handleNavClick = (href: string) => {
    if (pathname === href) return;
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link
              href="/select"
              className="p-2 text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <Link
              href="/lucciair/build"
              className="text-xl font-bold text-gray-900 tracking-tight"
            >
              LUCCIAIR 실링팬
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-700 hover:text-gray-900"
            aria-label="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-bottom">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(href);
                }}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? "text-gray-900" : "text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
