"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useSessionStore } from "@/store/sessionStore";
import { LogOut, ShoppingCart, Package, Wrench } from "lucide-react";
import {
  clearStorefrontDataCache,
  warmStorefrontData,
} from "@/lib/storefront-data";

export default function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.totalCount);
  const clearCart = useCartStore((s) => s.clearCart);
  const clearSession = useSessionStore((s) => s.clearSession);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    warmStorefrontData();
    router.prefetch("/build");
    router.prefetch("/cart");
    router.prefetch("/orders");
  }, [router]);

  const navItems = [
    { href: "/build", icon: Wrench, label: "주문하기" },
    { href: "/cart", icon: ShoppingCart, label: "장바구니" },
    { href: "/orders", icon: Package, label: "내 주문" },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    clearCart();
    clearStorefrontDataCache();
    router.replace("/login");
    router.refresh();
  };

  const handleNavPrefetch = () => {
    warmStorefrontData();
    router.prefetch("/build");
    router.prefetch("/cart");
    router.prefetch("/orders");
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
          <Link
            href="/build"
            prefetch
            onMouseEnter={handleNavPrefetch}
            onTouchStart={handleNavPrefetch}
            className="text-xl font-bold text-gray-900 tracking-tight"
          >
            융스위치
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/cart"
              prefetch
              onMouseEnter={handleNavPrefetch}
              onTouchStart={handleNavPrefetch}
              className="relative p-2"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {mounted && cartCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {cartCount()}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-700 hover:text-gray-900"
              aria-label="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
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
                onMouseEnter={handleNavPrefetch}
                onTouchStart={handleNavPrefetch}
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
