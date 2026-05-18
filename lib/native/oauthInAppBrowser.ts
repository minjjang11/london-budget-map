"use client";

/**
 * Opens Google OAuth outside the Capacitor WebView.
 * Android: system browser (Chrome) via App Launcher — avoids 403 disallowed_useragent.
 * iOS: SFSafariViewController via @capacitor/browser.
 */
export async function openOAuthInAppBrowser(url: string): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    throw new Error("openOAuthInAppBrowser called outside native shell");
  }

  const platform = Capacitor.getPlatform();

  if (platform === "android") {
    const { AppLauncher } = await import("@capacitor/app-launcher");
    try {
      const { completed } = await AppLauncher.openUrl({ url });
      if (completed) return;
    } catch (err) {
      console.warn("[auth] Android system browser open failed, trying Custom Tab:", err);
    }
  }

  const { Browser } = await import("@capacitor/browser");
  if (platform === "ios") {
    await Browser.open({ url, presentationStyle: "fullscreen" });
    return;
  }

  await Browser.open({ url });
}

/** Closes in-app browser UI if used (no-op when OAuth ran in the system browser). */
export async function closeOAuthInAppBrowser(): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* already closed or external browser was used */
  }
}
