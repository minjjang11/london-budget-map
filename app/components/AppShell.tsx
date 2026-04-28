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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f5f3ee] px-6"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-budget-muted">London</p>
            <h1 className="mt-1.5 text-[2rem] font-extrabold tracking-[-0.04em] text-budget-text">Mappetite</h1>
            <p className="mt-2 text-[13px] font-medium text-budget-muted">Loading your map…</p>
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
