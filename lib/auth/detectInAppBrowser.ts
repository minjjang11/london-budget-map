export type InAppBrowserId =
  | "kakao"
  | "instagram"
  | "facebook"
  | "line"
  | "whatsapp"
  | "android-webview";

export type InAppBrowserDetection = {
  isInApp: boolean;
  id: InAppBrowserId | null;
};

/**
 * Detects embedded / in-app browsers where Google blocks OAuth (403 disallowed_useragent).
 * Does not apply to the Capacitor native shell or normal Chrome/Safari.
 */
export function detectInAppBrowser(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): InAppBrowserDetection {
  const ua = userAgent;
  if (!ua) return { isInApp: false, id: null };

  if (/KAKAOTALK/i.test(ua)) return { isInApp: true, id: "kakao" };
  if (/Instagram/i.test(ua)) return { isInApp: true, id: "instagram" };
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return { isInApp: true, id: "facebook" };
  if (/\bLine\//i.test(ua) || /\bLine\//.test(ua)) return { isInApp: true, id: "line" };
  if (/WhatsApp/i.test(ua)) return { isInApp: true, id: "whatsapp" };
  if (/; wv\)/i.test(ua) || /\bwv\)/.test(ua)) return { isInApp: true, id: "android-webview" };

  return { isInApp: false, id: null };
}

export function isIosUserAgent(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}
