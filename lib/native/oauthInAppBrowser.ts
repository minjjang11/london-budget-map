"use client";

/** When Browser plugin opens via window.open fallback (web only). */
let oauthFallbackWindow: Window | null = null;

function isBrowserUnimplemented(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: string }).code === "UNIMPLEMENTED";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /not implemented/i.test(msg);
}

/**
 * Opens OAuth in Chrome Custom Tab (Android) or SFSafariViewController (iOS).
 * Never uses `window.open` in the Capacitor WebView — that causes nested login / letterboxing on Samsung.
 */
export async function openOAuthInAppBrowser(url: string): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  oauthFallbackWindow = null;

  const { Browser } = await import("@capacitor/browser");
  try {
    await Browser.open({
      url,
      presentationStyle: "popover",
    });
    return;
  } catch (err) {
    if (!isBrowserUnimplemented(err)) throw err;
  }

  throw new Error(
    "Could not open the sign-in browser on this device. Try email sign-in or update the app.",
  );
}

/** Closes Custom Tab / Safari VC opened by {@link openOAuthInAppBrowser}. */
export async function closeOAuthInAppBrowser(): Promise<void> {
  oauthFallbackWindow = null;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* already closed */
  }
}
