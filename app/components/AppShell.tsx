"use client";

import { useEffect, useState } from "react";

const SPLASH_MS = 1800;

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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F7FDFB] px-6"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <img
            src="/brand/mappitite-splash-full.png"
            alt="Mappetite splash"
            className="w-full max-w-[300px] object-contain drop-shadow-[0_10px_24px_rgb(13_31_26_/0.16)]"
            draggable={false}
          />
          <img
            src="/brand/mappetite-loading-text.png"
            alt="Loading budget-friendly spots..."
            className="mt-7 w-full max-w-[360px] object-contain opacity-90"
            draggable={false}
          />
        </div>
      ) : null}

      {showApp ? (
        <div className="budget-app-content-reveal flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      ) : null}
    </>
  );
}
