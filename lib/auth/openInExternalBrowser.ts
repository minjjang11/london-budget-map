import { isIosUserAgent } from "./detectInAppBrowser";

/** Canonical public site (open-in-browser links). */
export const PUBLIC_SITE_HTTPS = "https://maimomap.com";

/** URL to open when escaping an in-app browser (production). */
export function getOpenInBrowserUrl(): string {
  if (typeof window === "undefined") return PUBLIC_SITE_HTTPS;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return origin.replace(/\/+$/, "");
  }
  return PUBLIC_SITE_HTTPS;
}

const ANDROID_CHROME_INTENT =
  "intent://maimomap.com/#Intent;scheme=https;package=com.android.chrome;end";

/**
 * Tries to open Maimo Map in the system browser.
 * Android: Chrome intent, then HTTPS fallback. iOS: new tab / same window to public URL.
 */
export function openSiteInExternalBrowser(): void {
  if (typeof window === "undefined") return;

  const fallbackUrl = getOpenInBrowserUrl();
  const ua = window.navigator.userAgent;

  if (!isIosUserAgent(ua) && /Android/i.test(ua)) {
    window.location.href = ANDROID_CHROME_INTENT;
    window.setTimeout(() => {
      window.location.href = fallbackUrl;
    }, 700);
    return;
  }

  try {
    const opened = window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = fallbackUrl;
  } catch {
    window.location.href = fallbackUrl;
  }
}
