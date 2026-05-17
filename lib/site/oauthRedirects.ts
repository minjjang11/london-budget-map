import { Capacitor } from "@capacitor/core";
import { getBrowserAuthRedirectOrigin } from "./getBrowserAuthRedirectOrigin";

/** Capacitor native — must match Android intent-filter + iOS CFBundleURLSchemes + Supabase Redirect URLs. */
export const NATIVE_OAUTH_REDIRECT = "maimomap://auth/callback";

export const WEB_AUTH_CALLBACK_PATH = "/auth/callback";

const PRODUCTION_WEB_ORIGIN = "https://london-budget-map.vercel.app";

function envForcesNativeOAuth(): boolean {
  const v = process.env.NEXT_PUBLIC_CAPACITOR_OAUTH_NATIVE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function syncCapacitorNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* ignore */
  }
  try {
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const p = cap?.getPlatform?.();
    return p === "android" || p === "ios";
  } catch {
    return false;
  }
}

export function isEmbeddedCapacitorWebAsset(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: unknown }).Capacitor;
  if (!cap) return false;
  const { protocol, hostname } = window.location;
  if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  return false;
}

export async function isCapacitorNativeShell(): Promise<boolean> {
  if (syncCapacitorNativePlatform()) return true;
  if (isEmbeddedCapacitorWebAsset()) return true;
  try {
    const { App } = await import("@capacitor/app");
    await App.getInfo();
    return true;
  } catch {
    return false;
  }
}

export function isNativeOAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  if (envForcesNativeOAuth()) return true;
  return syncCapacitorNativePlatform() || isEmbeddedCapacitorWebAsset();
}

export function isNativeOAuthRedirect(redirectTo: string): boolean {
  return redirectTo.startsWith("maimomap://");
}

/** HTTPS callback for browser / Vercel (not Capacitor shell). */
export function getWebOAuthRedirectTo(): string {
  const pinned = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (pinned) {
    try {
      return `${new URL(pinned).origin.replace(/\/+$/, "")}${WEB_AUTH_CALLBACK_PATH}`;
    } catch {
      console.warn("[auth] NEXT_PUBLIC_SITE_URL is invalid; using production callback URL");
    }
  }
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${origin.replace(/\/+$/, "")}${WEB_AUTH_CALLBACK_PATH}`;
    }
  }
  return `${PRODUCTION_WEB_ORIGIN}${WEB_AUTH_CALLBACK_PATH}`;
}

/** Supabase `redirectTo` for Google OAuth. */
export async function getSupabaseOAuthRedirectTo(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (isNativeOAuthContext()) return NATIVE_OAUTH_REDIRECT;
  if (await isCapacitorNativeShell()) return NATIVE_OAUTH_REDIRECT;
  return getWebOAuthRedirectTo();
}

export function isNativeOAuthReturnUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith("maimomap://auth")) return false;
  return (
    trimmed.includes("code=") ||
    trimmed.includes("access_token=") ||
    trimmed.includes("error=")
  );
}

export function mapPathAfterAuth(): string {
  return syncCapacitorNativePlatform() || isEmbeddedCapacitorWebAsset() ? "/map.html" : "/map";
}
