import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "./components/AppShell";

export const metadata: Metadata = {
  title: "Mappetite — London prices, actually",
  description:
    "Crowdsourced cheap eats, pints & coffee in London. Built for students and young professionals who still read the menu prices.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f5f3ee",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="min-h-dvh">
        {/* Capacitor WKWebView: set before paint so SSR shell never shows 390px letterboxing. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var C=window.Capacitor;if(C&&C.isNativePlatform&&C.isNativePlatform())document.documentElement.classList.add("cap-native");}catch(_){}})();`,
          }}
        />
        {/* 모바일: 전체 너비. md+: ~iPhone 비율(390×844) 프레임 — 길쭉한 세로줄 느낌 완화. cap-native: 디바이스 전체 너비. */}
        <div className="budget-root-outer flex min-h-dvh w-full justify-center bg-zinc-400/25 md:items-center md:py-6 md:pl-4 md:pr-4">
          <div className="budget-root-inner flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-transparent md:min-h-0 md:h-[min(844px,calc(100dvh-3rem))] md:rounded-[2.25rem] md:border md:border-black/10 md:shadow-[0_28px_80px_-20px_rgb(0_0_0_/0.45)] md:[transform:translateZ(0)]">
            <AppShell>{children}</AppShell>
          </div>
        </div>
      </body>
    </html>
  );
}
