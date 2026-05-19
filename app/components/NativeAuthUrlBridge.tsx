"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ensureAuthSessionReady,
  finishOAuthCallback,
  OAUTH_STATUS_ERROR,
} from "@/lib/auth/finishOAuthCallback";
import { nativeOAuthDevLog, redactOAuthUrlForLog } from "@/lib/auth/nativeOAuthDevLog";
import { isNativeOAuthReturnUrl, parseNativeOAuthUrlMeta } from "@/lib/auth/nativeOAuthUrl";
import {
  closeOAuthInAppBrowser,
  registerNativeOAuthBrowserListeners,
} from "@/lib/native/oauthInAppBrowser";
import {
  isCapacitorNativeShell,
  mapPathAfterAuth,
} from "@/lib/site/oauthRedirects";

const NATIVE_OAUTH_WATCHDOG_MS = 120_000;
const OAUTH_HANDLED_KEY = "maimo:native-oauth-handled";

function scrubOAuthError(message: string): string {
  let s = message.trim();
  if (!s) return OAUTH_STATUS_ERROR;
  s = s.replace(/https?:\/\/[a-z0-9-]+\.supabase\.co[^\s]*/gi, "").trim();
  s = s.replace(/\bsupabase\b/gi, "Maimo Map");
  return s.trim() || OAUTH_STATUS_ERROR;
}

function dispatchAuthError(message: string): void {
  window.dispatchEvent(
    new CustomEvent("maimo-auth-error", { detail: scrubOAuthError(message) }),
  );
}

function dispatchAuthSuccess(): void {
  window.dispatchEvent(new CustomEvent("maimo-auth-success"));
}

function navigateNativeToMap(): void {
  const path = mapPathAfterAuth();
  nativeOAuthDevLog("navigation to /map:", path);
  if (!/\/map(\.html)?$/i.test(window.location.pathname || "")) {
    window.location.replace(path);
  }
}

function handledCallbackKey(rawUrl: string): string {
  let hash = 0;
  for (let i = 0; i < rawUrl.length; i += 1) {
    hash = (hash * 31 + rawUrl.charCodeAt(i)) | 0;
  }
  return `${OAUTH_HANDLED_KEY}:${Math.abs(hash).toString(36)}:${rawUrl.length}`;
}

async function handleOAuthReturnUrl(
  rawUrl: string,
  onAuthApplied?: () => void | Promise<void>,
): Promise<void> {
  nativeOAuthDevLog("appUrlOpen received URL:", redactOAuthUrlForLog(rawUrl));

  if (!isNativeOAuthReturnUrl(rawUrl)) {
    nativeOAuthDevLog("ignored — not maimomap OAuth callback");
    return;
  }

  const meta = parseNativeOAuthUrlMeta(rawUrl);
  nativeOAuthDevLog("callback code exists:", meta.hasCode);
  nativeOAuthDevLog("callback access_token exists:", meta.hasAccessToken);

  await closeOAuthInAppBrowser();

  if (meta.hasError) {
    nativeOAuthDevLog("OAuth error param:", meta.errorMessage ?? "(unknown)");
    dispatchAuthError(meta.errorMessage ?? OAUTH_STATUS_ERROR);
    return;
  }

  if (!isSupabaseConfigured()) {
    nativeOAuthDevLog("Supabase env missing at runtime");
    dispatchAuthError("Sign-in is not configured. Check NEXT_PUBLIC_SUPABASE_URL and anon key.");
    return;
  }

  const supabase = getBrowserSupabase();
  if (!supabase) {
    nativeOAuthDevLog("Supabase client missing");
    dispatchAuthError("Sign-in is not configured.");
    return;
  }

  const handledKey = handledCallbackKey(rawUrl);
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(handledKey) === "1") {
    nativeOAuthDevLog("duplicate callback skipped");
    if (await ensureAuthSessionReady(supabase)) {
      await Promise.resolve(onAuthApplied?.());
      navigateNativeToMap();
      dispatchAuthSuccess();
    }
    return;
  }

  const result = await finishOAuthCallback(supabase, rawUrl);
  nativeOAuthDevLog("exchangeCodeForSession success:", result.ok);
  if (!result.ok && result.error) {
    nativeOAuthDevLog("exchangeCodeForSession failure:", result.error);
  }

  const sessionOk = await ensureAuthSessionReady(supabase);
  nativeOAuthDevLog("session exists:", sessionOk);

  if (result.ok || sessionOk) {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(handledKey, "1");
    }
    await Promise.resolve(onAuthApplied?.());
    navigateNativeToMap();
    dispatchAuthSuccess();
    return;
  }

  dispatchAuthError(!result.ok && result.error ? result.error : OAUTH_STATUS_ERROR);
}

/** Capacitor: OAuth returns to `maimomap://auth/callback` with PKCE `code`. */
export function NativeAuthUrlBridge({ onAuthApplied }: { onAuthApplied?: () => void | Promise<void> }) {
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oauthActiveRef = useRef(false);
  const onAuthAppliedRef = useRef(onAuthApplied);

  useEffect(() => {
    onAuthAppliedRef.current = onAuthApplied;
  }, [onAuthApplied]);

  useEffect(() => {
    let appListener: { remove: () => Promise<void> } | undefined;
    let removeBrowserListeners: (() => void) | undefined;

    const clearWatchdog = () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };

    const onOAuthStarted = () => {
      oauthActiveRef.current = true;
      clearWatchdog();
      nativeOAuthDevLog("native OAuth flow started");
      nativeOAuthDevLog("supabase configured:", isSupabaseConfigured());
      watchdogRef.current = setTimeout(() => {
        void (async () => {
          if (!oauthActiveRef.current) return;
          nativeOAuthDevLog("watchdog timeout — no callback completed");
          await closeOAuthInAppBrowser();
          const supabase = getBrowserSupabase();
          if (supabase && (await ensureAuthSessionReady(supabase))) {
            oauthActiveRef.current = false;
            await Promise.resolve(onAuthAppliedRef.current?.());
            navigateNativeToMap();
            dispatchAuthSuccess();
            return;
          }
          oauthActiveRef.current = false;
          dispatchAuthError(OAUTH_STATUS_ERROR);
        })();
      }, NATIVE_OAUTH_WATCHDOG_MS);
    };

    const onOAuthSuccess = () => {
      oauthActiveRef.current = false;
      clearWatchdog();
    };

    const onOAuthError = () => {
      oauthActiveRef.current = false;
      clearWatchdog();
    };

    void (async () => {
      try {
        if (!(await isCapacitorNativeShell())) return;

        removeBrowserListeners = await registerNativeOAuthBrowserListeners();

        const { App } = await import("@capacitor/app");

        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          nativeOAuthDevLog("getLaunchUrl:", redactOAuthUrlForLog(launch.url));
          await handleOAuthReturnUrl(launch.url, onAuthAppliedRef.current);
        }

        appListener = await App.addListener("appUrlOpen", async (event) => {
          await handleOAuthReturnUrl(event.url, onAuthAppliedRef.current);
        });
      } catch (err) {
        console.warn("[auth] NativeAuthUrlBridge:", err);
      }
    })();

    window.addEventListener("maimo-native-oauth-started", onOAuthStarted);
    window.addEventListener("maimo-auth-success", onOAuthSuccess);
    window.addEventListener("maimo-auth-error", onOAuthError);

    return () => {
      clearWatchdog();
      void appListener?.remove();
      removeBrowserListeners?.();
      window.removeEventListener("maimo-native-oauth-started", onOAuthStarted);
      window.removeEventListener("maimo-auth-success", onOAuthSuccess);
      window.removeEventListener("maimo-auth-error", onOAuthError);
    };
  }, []);

  return null;
}
