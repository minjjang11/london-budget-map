"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { consumeAuthTokensFromUrl } from "@/lib/supabase/consumeAuthCallbackUrl";
import { syncCapacitorNativePlatform } from "@/lib/site/getSupabaseOAuthRedirectTo";

/**
 * Web: Google OAuth returns to e.g. `/map?code=…` — exchange for a session so users don’t sit on a Supabase URL.
 * Native uses {@link NativeAuthUrlBridge} only.
 */
export function WebAuthUrlBridge({ onAuthApplied }: { onAuthApplied?: () => void | Promise<void> }) {
  const consumedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || syncCapacitorNativePlatform()) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const href = window.location.href;
    if (!/[?&#](code|access_token)=/.test(href)) return;
    if (consumedRef.current) return;

    let cancelled = false;
    void (async () => {
      const { ok } = await consumeAuthTokensFromUrl(supabase, href);
      if (!ok || cancelled) return;
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
