"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useSessionStore } from "@/store/sessionStore";
import { LogOut, ShoppingCart, Package, Wrench, Boxes, ChevronLeft } from "lucide-react";
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
    router.prefetch("/jung/build");
    router.prefetch("/jung/single");
    router.prefetch("/jung/cart");
    router.prefetch("/jung/orders");
  }, [router]);

  const navItems = [
    { href: "/jung/build", icon: Wrench, label: "세트견적" },
    { href: "/jung/single", icon: Boxes, label: "낱개부품" },
    { href: "/jung/cart", icon: ShoppingCart, label: "견적바구니" },
    { href: "/jung/orders", icon: Package, label: "My견적" },
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
    router.prefetch("/jung/build");
    router.prefetch("/jung/single");
    router.prefetch("/jung/cart");
    router.prefetch("/jung/orders");
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
            <Link href="/select" className="p-2 text-gray-500 hover:text-gray-900">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <Link
              href="/jung/build"
              prefetch
              onMouseEnter={handleNavPrefetch}
              onTouchStart={handleNavPrefetch}
              className="text-xl font-bold text-gray-900 tracking-tight"
            >
              JUNG 스위치
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/jung/cart"
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
        <div className="max-w-lg mx-auto grid grid-cols-4">
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
                className={`relative flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? "text-gray-900" : "text-gray-400"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {mounted && href === "/jung/cart" && cartCount() > 0 && (
                    <span
                      className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold"
                      style={{ fontSize: "11px", lineHeight: 1 }}
                    >
                      {cartCount() > 99 ? "99+" : cartCount()}
                    </span>
                  )}
                </div>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
