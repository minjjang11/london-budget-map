import { Capacitor } from "@capacitor/core";
import { getBrowserAuthRedirectOrigin } from "./getBrowserAuthRedirectOrigin";

/** Capacitor native — must match Android/iOS URL scheme + Supabase Auth "Redirect URLs". */
export const NATIVE_OAUTH_REDIRECT = "maimomap://auth/callback";

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

/** Web/mobile browser OAuth return (not the Capacitor shell). */
export function getWebOAuthRedirectTo(): string {
  const origin = getBrowserAuthRedirectOrigin();
  if (origin) return `${origin.replace(/\/+$/, "")}/map`;
  return `${PRODUCTION_WEB_ORIGIN}/map`;
}

/**
 * Supabase `redirectTo` for Google OAuth.
 * Native app → custom scheme. Phone/desktop browser → /map (WebAuthUrlBridge handles ?code=).
 */
export async function getSupabaseOAuthRedirectTo(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (envForcesNativeOAuth()) return NATIVE_OAUTH_REDIRECT;
  if (syncCapacitorNativePlatform()) return NATIVE_OAUTH_REDIRECT;
  if (isEmbeddedCapacitorWebAsset()) return NATIVE_OAUTH_REDIRECT;
  if (await isCapacitorNativeShell()) return NATIVE_OAUTH_REDIRECT;
  return getWebOAuthRedirectTo();
}

export function isNativeOAuthReturnUrl(url: string): boolean {
  const scheme = NATIVE_OAUTH_REDIRECT.split("://")[0];
  return Boolean(
    scheme &&
      url.includes(`${scheme}://`) &&
      (url.includes("code=") || url.includes("access_token=") || url.includes("error=")),
  );
}

export function mapPathAfterAuth(): string {
  return syncCapacitorNativePlatform() || isEmbeddedCapacitorWebAsset() ? "/map.html" : "/map";
}
