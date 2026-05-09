"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Web: land on `/` long enough for crawlers to see SSR legal links, then open the map like before.
 * Native: skip — `layout.tsx` redirects to `/map.html` before paint when possible.
 */
export function WebRootRedirect() {
  const router = useRouter();

  useLayoutEffect(() => {
    try {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (cap?.isNativePlatform?.()) return;
    } catch {
      /* noop */
    }
    router.replace("/map");
  }, [router]);

  return null;
}
