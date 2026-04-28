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
            <svg aria-hidden viewBox="0 0 100 140" className="h-[104px] w-auto select-none">
              <defs>
                <linearGradient id="splash-pin-gradient" x1="50" y1="0" x2="50" y2="140" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00EDC6" />
                  <stop offset="68%" stopColor="#00C899" />
                  <stop offset="100%" stopColor="#6A71FF" />
                </linearGradient>
              </defs>
              <path
                d="M50 0C77 0 98 22 98 50C98 62 93 73 84 84L50 140L16 84C7 73 2 62 2 50C2 22 23 0 50 0Z"
                fill="url(#splash-pin-gradient)"
              />
            </svg>
            <h1
              className="mt-4 text-[clamp(2.2rem,10vw,3.8rem)] font-extrabold leading-none tracking-[-0.03em]"
              style={{ color: "#00A883" }}
            >
              Mappetite
            </h1>
          </div>
          <p
            className="absolute left-1/2 top-[84%] -translate-x-1/2 whitespace-nowrap text-[clamp(0.9rem,3vw,1.15rem)] font-semibold tracking-[-0.01em] text-budget-muted/90"
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
