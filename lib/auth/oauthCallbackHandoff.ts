import { NATIVE_OAUTH_REDIRECT } from "@/lib/site/oauthRedirects";

/** True when `/auth/callback` in a mobile browser tab should hand off to the native app. */
export function shouldHandOffWebCallbackToNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
  if (!mobile) return false;
  const host = window.location.hostname;
  return (
    host === "london-budget-map.vercel.app" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app")
  );
}

/** Sends OAuth params to the Capacitor app (Custom Tab → app), avoiding a second code exchange on Vercel. */
export function buildNativeOAuthHandoffUrl(): string {
  const q = window.location.search || "";
  const h = window.location.hash || "";
  return `${NATIVE_OAUTH_REDIRECT}${q}${h}`;
}
