"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  ensureAuthSessionReady,
  finishOAuthCallback,
  OAUTH_STATUS_ERROR,
  OAUTH_STATUS_LOADING,
} from "@/lib/auth/finishOAuthCallback";
import { mapPathAfterAuth, syncCapacitorNativePlatform } from "@/lib/site/oauthRedirects";

const CALLBACK_LOCK_KEY = "maimo:oauth-callback-lock";

/** Web OAuth return: exchange PKCE code, wait for session, then go to /map on this host. */
export default function AuthCallbackPage() {
  const [message, setMessage] = useState(OAUTH_STATUS_LOADING);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (syncCapacitorNativePlatform()) {
      window.location.replace(mapPathAfterAuth());
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
  setMessage(OAUTH_STATUS_LOADING);

  const supabase = getBrowserSupabase();
  if (!supabase) {
    setMessage("Sign-in is not configured.");
    return;
  }

  const href = window.location.href;
  if (!/[?&#](code|access_token|error)=/.test(href)) {
    window.location.replace(mapPathAfterAuth());
    return;
  }

  try {
    const lock = sessionStorage.getItem(CALLBACK_LOCK_KEY);
    if (lock === "done") {
      if (await ensureAuthSessionReady(supabase)) {
        window.location.replace(mapPathAfterAuth());
        return;
      }
    }
    if (!lock) sessionStorage.setItem(CALLBACK_LOCK_KEY, "pending");

    const result = await finishOAuthCallback(supabase, href);

    if (result.ok) {
      const ready = await ensureAuthSessionReady(supabase);
      if (ready) {
        sessionStorage.setItem(CALLBACK_LOCK_KEY, "done");
        window.location.replace(mapPathAfterAuth());
        return;
      }
      setMessage(OAUTH_STATUS_LOADING);
      const retry = await ensureAuthSessionReady(supabase);
      sessionStorage.setItem(CALLBACK_LOCK_KEY, "done");
      window.location.replace(mapPathAfterAuth());
      if (!retry && process.env.NODE_ENV !== "production") {
        console.warn("[auth] OAuth callback: session not confirmed before redirect");
      }
      return;
    }

    if (await ensureAuthSessionReady(supabase)) {
      sessionStorage.setItem(CALLBACK_LOCK_KEY, "done");
      window.location.replace(mapPathAfterAuth());
      return;
    }

    if (result.error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[auth] OAuth callback failed:", result.error);
      }
      setMessage(OAUTH_STATUS_ERROR);
      window.setTimeout(() => {
        sessionStorage.removeItem(CALLBACK_LOCK_KEY);
        window.location.replace(
          `${mapPathAfterAuth()}?auth_error=${encodeURIComponent(result.error!)}`,
        );
      }, 1500);
      return;
    }

    window.location.replace(mapPathAfterAuth());
  } catch {
    sessionStorage.removeItem(CALLBACK_LOCK_KEY);
    setMessage(OAUTH_STATUS_ERROR);
  }
}
