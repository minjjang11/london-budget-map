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
          <div className="w-full max-w-[156px]">
            <img
              src="/brand/mappitite-logo.png"
              alt="Mappitite"
              className="h-auto w-full object-contain drop-shadow-[0_8px_20px_rgb(13_31_26_/0.12)]"
            />
          </div>
          <div className="budget-app-splash-spinner mt-8" aria-hidden />
        </div>
      ) : null}

      {showApp ? (
        <div className="budget-app-content-reveal flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      ) : null}
    </>
  );
}
