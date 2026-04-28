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
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#FCFFFF]">
          <div className="absolute inset-0 bg-[#FCFFFF]" />
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div
              aria-hidden
              className="h-[120px] w-[92px]"
              style={{
                background:
                  "linear-gradient(180deg, rgb(0 237 198) 0%, rgb(0 200 153) 64%, rgb(106 113 255) 100%)",
                clipPath: "path('M46 0 C71 0 92 21 92 46 C92 66 74 84 59 101 L46 120 L33 101 C18 84 0 66 0 46 C0 21 21 0 46 0 Z')",
                filter: "drop-shadow(0 4px 14px rgba(5, 80, 63, 0.22))",
              }}
            />
            <h1
              className="mt-5 text-[clamp(2.5rem,11vw,4.25rem)] font-extrabold leading-none tracking-[-0.03em]"
              style={{ color: "#00A883" }}
            >
              Mappetite
            </h1>
          </div>
          <p
            className="absolute left-1/2 top-[80%] -translate-x-1/2 text-[clamp(1rem,3.4vw,1.35rem)] font-semibold tracking-[-0.01em] text-budget-muted/90"
            aria-label="Loading budget-friendly spots..."
          >
            Loading budget-friendly spots...
          </p>
        </div>
      ) : null}

      {showApp ? (
        <div className="budget-app-content-reveal flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      ) : null}
    </>
  );
}
