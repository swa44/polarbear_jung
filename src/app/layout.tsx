import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/pwa/PWARegister";

export const metadata: Metadata = {
  title: "폴라베어 융스위치",
  description: "원하는 구성으로 스위치를 직접 설계하고 견적을 요청하세요.",
  applicationName: "융스위치",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "융스위치",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#18181b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
