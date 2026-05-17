"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { consumeAuthTokensFromUrl } from "@/lib/supabase/consumeAuthCallbackUrl";
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

    void (async () => {
      const { ok, error } = await consumeAuthTokensFromUrl(supabase, href);
      if (!ok) {
        const detail = error ?? "sign_in_failed";
        console.error("[auth] OAuth callback failed:", detail);
        setMessage("Sign-in could not be completed. Returning to the map…");
        window.setTimeout(() => {
          window.location.replace(`${mapPathAfterAuth()}?auth_error=${encodeURIComponent(detail)}`);
        }, 1200);
        return;
      }
      window.location.replace(mapPathAfterAuth());
    })();
  }, []);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[14px] font-semibold text-budget-text">{message}</p>
    </div>
  );
}
