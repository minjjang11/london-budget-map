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
          className="fixed inset-0 z-[9999] overflow-hidden bg-[#ffffff]"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <img
            src="/brand/mappitite-splash-full.png"
            alt="Mappetite splash"
            className="absolute left-1/2 top-[45%] w-[min(58vw,300px)] -translate-x-1/2 -translate-y-1/2 object-contain"
            style={{ imageRendering: "auto" }}
            draggable={false}
          />
          <img
            src="/brand/mappetite-loading-text.png"
            alt="Loading budget-friendly spots..."
            className="absolute left-1/2 top-[67%] w-[min(54vw,290px)] -translate-x-1/2 object-contain opacity-90"
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
