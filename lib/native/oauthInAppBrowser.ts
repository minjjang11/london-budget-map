"use client";

/** When Browser plugin opens via window.open fallback (same-tab/CT). */
let oauthFallbackWindow: Window | null = null;

function isBrowserUnimplemented(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: string }).code === "UNIMPLEMENTED";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /not implemented/i.test(msg);
}

/** Opens OAuth URL in Custom Tab, or WebView fallback if the native plugin is missing. */
export async function openOAuthInAppBrowser(url: string): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  oauthFallbackWindow = null;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
    return;
  } catch (err) {
    if (!isBrowserUnimplemented(err)) throw err;
  }

  oauthFallbackWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!oauthFallbackWindow) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/** Closes Custom Tab or the fallback window opened by {@link openOAuthInAppBrowser}. */
export async function closeOAuthInAppBrowser(): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    try {
      oauthFallbackWindow?.close();
    } finally {
      oauthFallbackWindow = null;
    }
  }
}
