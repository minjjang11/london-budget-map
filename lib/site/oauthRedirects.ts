import { Capacitor } from "@capacitor/core";
import { PUBLIC_SITE_HTTPS } from "@/lib/auth/openInExternalBrowser";
import { getWebAuthOrigin } from "./webAuthOrigin";

/** Capacitor native — must match Android/iOS URL scheme + Supabase Auth "Redirect URLs". */
export const NATIVE_OAUTH_REDIRECT = "maimomap://auth/callback";

const WEB_AUTH_CALLBACK_PATH = "/auth/callback";

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

/**
 * Web/mobile browser OAuth return (not the Capacitor shell).
 * Production always uses maimomap.com — never NEXT_PUBLIC_SITE_URL (often still vercel.app on deploy).
 */
export function getWebOAuthRedirectTo(): string {
  return `${getWebAuthOrigin()}${WEB_AUTH_CALLBACK_PATH}`;
}

/**
 * Supabase `redirectTo` for Google OAuth.
 * Native app → custom scheme. Web browser → /auth/callback on maimomap.com (or current vercel host).
 */
export async function getSupabaseOAuthRedirectTo(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (envForcesNativeOAuth()) return NATIVE_OAUTH_REDIRECT;
  if (syncCapacitorNativePlatform()) return NATIVE_OAUTH_REDIRECT;
  if (isEmbeddedCapacitorWebAsset()) return NATIVE_OAUTH_REDIRECT;
  if (await isCapacitorNativeShell()) return NATIVE_OAUTH_REDIRECT;
  return getWebOAuthRedirectTo();
}

export { isNativeOAuthReturnUrl } from "@/lib/auth/nativeOAuthUrl";

export function mapPathAfterAuth(): string {
  return syncCapacitorNativePlatform() || isEmbeddedCapacitorWebAsset() ? "/map.html" : "/map";
}
