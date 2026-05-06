"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { consumeAuthTokensFromUrl } from "@/lib/supabase/consumeAuthCallbackUrl";
import { closeOAuthInAppBrowser } from "@/lib/native/oauthInAppBrowser";
import { isCapacitorNativeShell, NATIVE_OAUTH_REDIRECT } from "@/lib/site/getSupabaseOAuthRedirectTo";

function isNativeOAuthReturn(url: string): boolean {
  const scheme = NATIVE_OAUTH_REDIRECT.split("://")[0];
  return Boolean(scheme && url.includes(`${scheme}://`) && (url.includes("code=") || url.includes("access_token=") || url.includes("error=")));
}

async function handleOAuthReturnUrl(
  rawUrl: string,
  onAuthApplied?: () => void,
): Promise<void> {
  if (!isNativeOAuthReturn(rawUrl)) return;
  const supabase = getBrowserSupabase();
  if (!supabase) return;

  const { ok, error } = await consumeAuthTokensFromUrl(supabase, rawUrl);

  await closeOAuthInAppBrowser();

  if (ok) {
    onAuthApplied?.();
    return;
  }
  if (error) {
    window.dispatchEvent(new CustomEvent("mappetite-auth-error", { detail: error }));
  }
}

/**
 * Capacitor: OAuth returns to `com.mappetite.app://...` with PKCE `code` or hash tokens.
 * Must call `exchangeCodeForSession` — implicit hash-only handling was leaving users stuck in Chrome.
 */
export function NativeAuthUrlBridge({ onAuthApplied }: { onAuthApplied?: () => void }) {
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;

    void (async () => {
      try {
        if (!(await isCapacitorNativeShell())) return;
        const { App } = await import("@capacitor/app");

        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          await handleOAuthReturnUrl(launch.url, onAuthApplied);
        }

        const sub = await App.addListener("appUrlOpen", async (event) => {
          await handleOAuthReturnUrl(event.url, onAuthApplied);
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
