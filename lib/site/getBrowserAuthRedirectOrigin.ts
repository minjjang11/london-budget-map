/**
 * Origin used for Supabase magic-link `emailRedirectTo` from the browser.
 *
 * - No hardcoded localhost: dev uses whatever host the app is served on (e.g. localhost:3000 from `window.location`).
 * - Optional `NEXT_PUBLIC_SITE_URL` (full URL with scheme) pins the canonical origin in production when set.
 */
export function getBrowserAuthRedirectOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      console.warn("[auth] NEXT_PUBLIC_SITE_URL is invalid; falling back to window.location.origin");
    }
  }
  return window.location.origin;
}
