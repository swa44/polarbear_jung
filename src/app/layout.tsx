import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/pwa/PWARegister";

export const metadata: Metadata = {
  title: "폴라베어 실시간 견적 시스템",
  description: "원하는 구성으로 스위치를 직접 설계하고 견적을 요청하세요.",
  applicationName: "폴라베어 실시간 견적",
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
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
          type="text/css"
        />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
