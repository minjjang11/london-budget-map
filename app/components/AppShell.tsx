"use client";

import { useEffect, useState } from "react";
import { brandImg } from "@/lib/site/brandAssets";

const SPLASH_MS = 1800;

const SPLASH_BG = "#FCFFFF";

/**
 * In-app splash: solid fill + transparent logo asset only (no full-screen mockup / nested screenshot).
 * Native launch screens use the same colour in Android `splash.xml` / iOS LaunchScreen + Capacitor config.
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
          className="fixed inset-0 z-[9999] flex flex-col bg-[#FCFFFF]"
          style={{ backgroundColor: SPLASH_BG }}
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
            <img
              src={brandImg("/brand/maimo-splash-logo-transparent.png")}
              alt=""
              className="w-[min(43.2vw,192px)] max-h-[38vh] object-contain select-none"
              style={{ imageRendering: "auto" }}
              draggable={false}
            />
            <p className="mt-3 text-center text-[clamp(1.05rem,4.2vw,1.28rem)] font-extrabold tracking-[-0.02em] text-budget-primary">
              Maimo Map
            </p>
          </div>
          <p
            className="shrink-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 text-center text-[clamp(0.9rem,3vw,1.15rem)] font-semibold tracking-[-0.01em] text-budget-muted/90"
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
