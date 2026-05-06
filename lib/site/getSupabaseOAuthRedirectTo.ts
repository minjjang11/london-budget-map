import { getBrowserAuthRedirectOrigin } from "./getBrowserAuthRedirectOrigin";

/** Must match Android/iOS URL scheme + Supabase Auth "Redirect URLs". */
export const NATIVE_OAUTH_REDIRECT = "com.mappetite.app://auth/callback";

function envForcesNativeOAuth(): boolean {
  const v = process.env.NEXT_PUBLIC_CAPACITOR_OAUTH_NATIVE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Synchronous: Capacitor injects `window.Capacitor` before user interaction on real devices.
 * Prefer this over async detection so OAuth never briefly falls back to Vercel `redirectTo`.
 */
export function syncCapacitorNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const p = cap?.getPlatform?.();
    return p === "android" || p === "ios";
  } catch {
    return false;
  }
}

/**
 * Android/iOS shell loads bundled assets from `https://localhost` / `file:` — `getPlatform()`
 * can still report `"web"`. If the Capacitor bridge exists and we're not on the public site
 * hostname, OAuth must use the custom scheme or Supabase falls back to `NEXT_PUBLIC_SITE_URL`.
 */
export function isEmbeddedCapacitorWebAsset(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: unknown }).Capacitor;
  if (!cap) return false;
  const { protocol, hostname } = window.location;
  if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  return false;
}

/**
 * True when running inside the Capacitor native shell (not the mobile browser).
 * Uses sync `getPlatform` first, then `@capacitor/app` `getInfo()` (web throws).
 */
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

/** Supabase `redirectTo` for OAuth: custom scheme in Capacitor, HTTPS on web. */
export async function getSupabaseOAuthRedirectTo(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (envForcesNativeOAuth()) return NATIVE_OAUTH_REDIRECT;
  if (syncCapacitorNativePlatform()) return NATIVE_OAUTH_REDIRECT;
  if (isEmbeddedCapacitorWebAsset()) return NATIVE_OAUTH_REDIRECT;
  if (await isCapacitorNativeShell()) return NATIVE_OAUTH_REDIRECT;
  const origin = getBrowserAuthRedirectOrigin();
  return origin ? `${origin}/map` : "";
}
