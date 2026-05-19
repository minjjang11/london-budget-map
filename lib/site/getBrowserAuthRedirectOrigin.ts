import { getWebAuthOrigin } from "./webAuthOrigin";

/**
 * Origin for Supabase magic-link `emailRedirectTo` from the browser.
 * Prefers the current host (e.g. www.maimomap.com), not NEXT_PUBLIC_SITE_URL when that points at Vercel.
 */
export function getBrowserAuthRedirectOrigin(): string {
  return getWebAuthOrigin();
}
