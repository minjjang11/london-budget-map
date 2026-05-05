"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { consumeAuthTokensFromUrl } from "@/lib/supabase/consumeAuthCallbackUrl";

/**
 * Capacitor: Google OAuth returns to `com.mappetite.app://auth/callback#access_token=…`
 * via an intent / universal link. Apply tokens inside the WebView and close the system browser.
 */
export function NativeAuthUrlBridge({ onAuthApplied }: { onAuthApplied?: () => void }) {
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const { Browser } = await import("@capacitor/browser");
        const sub = await App.addListener("appUrlOpen", async (event) => {
          const supabase = getBrowserSupabase();
          if (!supabase) return;
          const { ok } = await consumeAuthTokensFromUrl(supabase, event.url);
          if (ok) {
            try {
              await Browser.close();
            } catch {
              /* already closed */
            }
            onAuthApplied?.();
          }
        });
        handle = sub;
      } catch {
        /* web build */
      }
    })();

    return () => {
      void handle?.remove();
    };
  }, [onAuthApplied]);

  return null;
}
