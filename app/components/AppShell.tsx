"use client";

import { useEffect, useState } from "react";

const SPLASH_MS = 1600;

/**
 * Capacitor / mobile: show a branded splash before mounting the main tree
 * so the first paint is not a blank WebView.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShowApp(true), SPLASH_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {!showApp ? (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#edf2f2] px-6"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex flex-col items-center">
            <div className="relative h-[34px] w-[28px]" aria-hidden>
              <div className="absolute left-0 top-0 h-[27px] w-[27px] rounded-full bg-gradient-to-b from-[#16cba7] to-[#06b78e] shadow-[0_7px_14px_rgb(13_31_26_/0.16)]" />
              <div className="absolute left-1/2 top-[21px] h-0 w-0 -translate-x-1/2 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-[#4a56d9]" />
            </div>
            <img
              src="/brand/mappitite-wordmark.png"
              alt="Mappitite"
              className="mt-2 h-[30px] w-auto object-contain drop-shadow-[0_5px_12px_rgb(13_31_26_/0.12)]"
              draggable={false}
            />
          </div>
        </div>
      ) : null}

      {showApp ? (
        <div className="budget-app-content-reveal flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      ) : null}
    </>
  );
}
