"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  buildNativeOAuthHandoffUrl,
  shouldHandOffWebCallbackToNativeApp,
} from "@/lib/auth/oauthCallbackHandoff";
import {
  consumeAuthTokensFromUrl,
  isOAuthCodeReuseError,
} from "@/lib/supabase/consumeAuthCallbackUrl";
import { mapPathAfterAuth, syncCapacitorNativePlatform } from "@/lib/site/oauthRedirects";

/** Web OAuth return (`/auth/callback?code=…`). Native uses `maimomap://` via NativeAuthUrlBridge. */
export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in…");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (syncCapacitorNativePlatform()) {
      window.location.replace(mapPathAfterAuth());
      return;
    }

    const href = window.location.href;
    const hasAuthParams = /[?&#](code|access_token|error)=/.test(href);

    if (!hasAuthParams) {
      window.location.replace(mapPathAfterAuth());
      return;
    }

    if (shouldHandOffWebCallbackToNativeApp()) {
      setMessage("Returning to Maimo Map…");
      window.location.replace(buildNativeOAuthHandoffUrl());
      window.setTimeout(() => {
        void runWebCallbackExchange(setMessage);
      }, 1600);
      return;
    }

    void runWebCallbackExchange(setMessage);
  }, []);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[14px] font-semibold text-budget-text">{message}</p>
    </div>
  );
}

async function runWebCallbackExchange(setMessage: (msg: string) => void): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    setMessage("Sign-in is not configured.");
    return;
  }

  const href = window.location.href;
  const { ok, error } = await consumeAuthTokensFromUrl(supabase, href);
  if (ok) {
    window.location.replace(mapPathAfterAuth());
    return;
  }

  if (error && isOAuthCodeReuseError(error)) {
    setMessage("Returning to Maimo Map…");
    if (shouldHandOffWebCallbackToNativeApp()) {
      window.location.replace(buildNativeOAuthHandoffUrl());
    } else {
      window.location.replace(mapPathAfterAuth());
    }
    return;
  }

  if (error) {
    console.error("[auth] OAuth callback failed:", error);
  }
  setMessage("Sign-in could not be completed. Returning to the map…");
  window.setTimeout(() => {
    window.location.replace(
      `${mapPathAfterAuth()}?auth_error=${encodeURIComponent(error ?? "sign_in_failed")}`,
    );
  }, 1200);
}
