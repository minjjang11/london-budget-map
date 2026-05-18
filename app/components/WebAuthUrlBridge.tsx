"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { finishOAuthCallback } from "@/lib/auth/finishOAuthCallback";
import { syncCapacitorNativePlatform } from "@/lib/site/getSupabaseOAuthRedirectTo";

/**
 * Web/mobile browser: Google OAuth returns to `/map?code=…` — exchange in the same tab.
 * Native Capacitor uses {@link NativeAuthUrlBridge} only.
 */
export function WebAuthUrlBridge({ onAuthApplied }: { onAuthApplied?: () => void | Promise<void> }) {
  const consumedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || syncCapacitorNativePlatform()) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const href = window.location.href;
    if (!/[?&#](code|access_token|error)=/.test(href)) return;
    if (consumedRef.current) return;

    let cancelled = false;
    void (async () => {
      const result = await finishOAuthCallback(supabase, href);
      if (!result.ok || cancelled) return;
      consumedRef.current = true;

      try {
        const u = new URL(href);
        u.searchParams.delete("code");
        u.searchParams.delete("state");
        if (u.hash && /access_token|refresh_token/.test(u.hash)) {
          u.hash = "";
        }
        const next = u.pathname + (u.search ? u.search : "") + u.hash;
        window.history.replaceState({}, document.title, next || "/");
      } catch {
        /* strip failed — session still set */
      }

      await Promise.resolve(onAuthApplied?.());
    })();

    return () => {
      cancelled = true;
    };
  }, [onAuthApplied]);

  return null;
}
