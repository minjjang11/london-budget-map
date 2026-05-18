"use client";

import { nativeOAuthDevLog } from "@/lib/auth/nativeOAuthDevLog";

let browserListenerCleanup: (() => void) | null = null;

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
  window.dispatchEvent(new CustomEvent("maimo-native-oauth-started"));

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
    nativeOAuthDevLog("Browser.open (iOS SFSafariViewController)");
    await Browser.open({ url, presentationStyle: "fullscreen" });
    return;
  }

  await Browser.open({ url });
}

/** Optional: log when the in-app browser closes (user dismiss or programmatic close). */
export async function registerNativeOAuthBrowserListeners(): Promise<() => void> {
  browserListenerCleanup?.();
  browserListenerCleanup = null;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return () => undefined;

  const { Browser } = await import("@capacitor/browser");
  const handles: { remove: () => Promise<void> }[] = [];

  try {
    const finished = await Browser.addListener("browserFinished", () => {
      nativeOAuthDevLog("browserFinished");
    });
    handles.push(finished);
  } catch {
    /* ignore */
  }

  const cleanup = () => {
    void Promise.all(handles.map((h) => h.remove()));
  };
  browserListenerCleanup = cleanup;
  return cleanup;
}

/** Closes in-app browser UI if used (no-op when OAuth ran in the system browser). */
export async function closeOAuthInAppBrowser(): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
    nativeOAuthDevLog("Browser.close");
  } catch {
    /* already closed or external browser was used */
  }
}
