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
            {/* Teardrop map pin — circle cap + straight sides to sharp tip (matches brand reference silhouette) */}
            <svg
              aria-hidden
              viewBox="0 0 100 138"
              className="h-[88px] w-auto select-none"
              shapeRendering="geometricPrecision"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="splash-pin-gradient" x1="50" y1="0" x2="50" y2="138" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00D18E" />
                  <stop offset="66%" stopColor="#00BA9A" />
                  <stop offset="100%" stopColor="#4A47E0" />
                </linearGradient>
              </defs>
              {/* Apex (cx,cy)=(50,53), r=40; tangents intersect at apex; dome is a single circular arc */}
              <path
                fill="url(#splash-pin-gradient)"
                d="
                  M 50 131.71281225
                  L 65.52786405 93.93428587
                  A 40 40 0 0 1 34.47213595 93.93428587
                  Z
                "
              />
            </svg>
            {/* Wordmark: bright mint/teal aligned with gradient top */}
            <h1
              className="mt-4 text-[clamp(1.75rem,8.2vw,2.9rem)] font-extrabold leading-none tracking-[-0.03em]"
              style={{ color: "#00C896", letterSpacing: "-0.04em" }}
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
