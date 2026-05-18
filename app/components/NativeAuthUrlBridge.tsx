"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { finishOAuthCallback } from "@/lib/auth/finishOAuthCallback";
import { closeOAuthInAppBrowser } from "@/lib/native/oauthInAppBrowser";
import {
  isCapacitorNativeShell,
  isNativeOAuthReturnUrl,
  mapPathAfterAuth,
} from "@/lib/site/oauthRedirects";

async function handleOAuthReturnUrl(
  rawUrl: string,
  onAuthApplied?: () => void,
): Promise<void> {
  if (!isNativeOAuthReturnUrl(rawUrl)) return;
  const supabase = getBrowserSupabase();
  if (!supabase) {
    console.error("[auth] Supabase client missing on OAuth return");
    return;
  }

  const result = await finishOAuthCallback(supabase, rawUrl);

  if (result.ok) {
    await closeOAuthInAppBrowser();
    await Promise.resolve(onAuthApplied?.());
    if (typeof window !== "undefined") {
      const path = window.location.pathname || "";
      if (!/\/map(\.html)?$/i.test(path)) {
        window.location.href = mapPathAfterAuth();
      }
    }
    return;
  }

  await closeOAuthInAppBrowser();

  if (result.error) {
    console.error("[auth] Native OAuth callback failed:", result.error);
    window.dispatchEvent(new CustomEvent("maimo-auth-error", { detail: result.error }));
  }
}

/** Capacitor: OAuth returns to `maimomap://auth/callback` with PKCE `code`. */
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
      } catch (err) {
        console.warn("[auth] NativeAuthUrlBridge:", err);
      }
    })();

    return () => {
      void handle?.remove();
    };
  }, [onAuthApplied]);

  return null;
}
