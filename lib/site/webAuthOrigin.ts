import { PUBLIC_SITE_HTTPS } from "@/lib/auth/openInExternalBrowser";

export function isMaimomapHostname(hostname: string): boolean {
  return hostname === "maimomap.com" || hostname === "www.maimomap.com";
}

/**
 * Origin for web OAuth / email redirects.
 * Uses the tab the user is on (www vs apex) — never a baked-in vercel.app env when on maimomap.com.
 */
export function getWebAuthOrigin(): string {
  if (typeof window === "undefined") {
    return PUBLIC_SITE_HTTPS;
  }
  const { hostname, origin } = window.location;
  const base = origin.replace(/\/+$/, "");
  if (hostname === "localhost" || hostname === "127.0.0.1") return base;
  if (hostname.endsWith(".vercel.app")) return base;
  if (isMaimomapHostname(hostname)) return base;
  return PUBLIC_SITE_HTTPS;
}
