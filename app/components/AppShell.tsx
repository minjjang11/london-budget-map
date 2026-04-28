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
          className="fixed inset-0 z-[9999] overflow-hidden bg-[#edf2f2]"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <img
            src="/brand/mappitite-splash-full.png"
            alt="Mappitite splash"
            className="h-full w-full object-cover"
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
