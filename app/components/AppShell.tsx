"use client";

import { useEffect, useState } from "react";
import { SplashBrandLockup } from "@/app/components/SplashBrandLockup";

const SPLASH_MS = 1800;

const SPLASH_BG = "#FCFFFF";

/**
 * In-app splash: solid fill + vector lockup (pin SVG + wordmark SVG from canonical assets — no live text).
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
            <SplashBrandLockup />
          </div>
          <p
            className="shrink-0 px-4 pb-[calc(max(1.25rem,env(safe-area-inset-bottom))+3rem)] pt-2 text-center text-[clamp(0.8rem,2.5vw,0.92rem)] font-medium tracking-[-0.01em] text-budget-muted/55"
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
