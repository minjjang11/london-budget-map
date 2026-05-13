"use client";

import { useEffect, useState } from "react";
import { brandImg } from "@/lib/site/brandAssets";

const SPLASH_MS = 1800;

/**
 * Capacitor / mobile: show a branded splash before mounting the main tree
 * so the first paint is not a blank WebView.
 * Center = pin graphic + app name (text). Bottom line = loading copy only once (not baked into PNG).
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
          <div
            className="absolute left-1/2 top-1/2 flex w-[min(43.2vw,192px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
            aria-label="Maimo Map"
          >
            <img
              src={brandImg("/brand/maimo-pin-native-1024.png")}
              alt=""
              className="h-auto w-full object-contain select-none"
              style={{ imageRendering: "auto" }}
              draggable={false}
            />
            <p className="mt-3 text-[clamp(1.05rem,4.2vw,1.28rem)] font-extrabold tracking-[-0.02em] text-budget-primary">
              Maimo Map
            </p>
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
