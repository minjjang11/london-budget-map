import { getBrowserAuthRedirectOrigin } from "./getBrowserAuthRedirectOrigin";
import {
  getSupabaseOAuthRedirectTo as getOAuthRedirectTo,
  isCapacitorNativeShell,
  NATIVE_OAUTH_REDIRECT,
  syncCapacitorNativePlatform,
  isEmbeddedCapacitorWebAsset,
} from "./oauthRedirects";

export {
  NATIVE_OAUTH_REDIRECT,
  syncCapacitorNativePlatform,
  isEmbeddedCapacitorWebAsset,
  isCapacitorNativeShell,
} from "./oauthRedirects";

/** @deprecated Import from `@/lib/site/oauthRedirects` — re-exported for existing imports. */
export async function getSupabaseOAuthRedirectTo(): Promise<string> {
  return getOAuthRedirectTo();
}

/**
 * `signInWithOtp` / magic-link `emailRedirectTo`. Must exactly match a URL in Supabase
 * Authentication → URL configuration → Redirect URLs.
 */
export async function getSupabaseEmailRedirectTo(): Promise<string | undefined> {
  const pinned = process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO?.trim();
  if (pinned) return pinned;
  if (await isCapacitorNativeShell()) return NATIVE_OAUTH_REDIRECT;
  const origin = getBrowserAuthRedirectOrigin();
  return origin ? `${origin}/map` : undefined;
}
