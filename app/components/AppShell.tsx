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
            <div className="relative h-[38px] w-[30px]" aria-hidden>
              <div className="absolute left-0 top-0 h-[30px] w-[30px] rounded-full bg-gradient-to-b from-[#13c7a2] to-[#08b894] shadow-[0_8px_18px_rgb(13_31_26_/0.18)]" />
              <div
                className="absolute left-1/2 top-[23px] h-0 w-0 -translate-x-1/2 border-l-[9px] border-r-[9px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#3f57d7]"
              />
            </div>
            <p className="mt-3 text-[36px] font-extrabold leading-none tracking-[-0.03em] text-[#08b894] drop-shadow-[0_4px_10px_rgb(13_31_26_/0.14)]">
              Mappitite
            </p>
          </div>
          <div className="budget-app-splash-spinner mt-10" aria-hidden />
        </div>
      ) : null}

      {showApp ? (
        <div className="budget-app-content-reveal flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      ) : null}
    </>
  );
}
