"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Opens the map first; marketing shell lives at `/home`. */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/map");
  }, [router]);

  // Show splash while redirecting
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#FCFFFF]">
      <div className="absolute inset-0 bg-[#FCFFFF]" />
      <div className="absolute left-1/2 top-1/2 w-[min(43.2vw,192px)] -translate-x-1/2 -translate-y-1/2">
        <img
          src="/brand/mappetite-lockup-native-2048.png"
          alt="Mappetite"
          className="h-auto w-full object-contain select-none"
          style={{ imageRendering: "auto" }}
          draggable={false}
        />
      </div>
      <p
        className="absolute left-1/2 top-[84%] -translate-x-1/2 whitespace-nowrap text-[clamp(0.9rem,3vw,1.15rem)] font-semibold tracking-[-0.01em] text-budget-muted/90"
        aria-label="Loading budget-friendly spots..."
      >
        Loading budget-friendly spots...
      </p>
    </div>
  );
}
