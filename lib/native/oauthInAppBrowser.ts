"use client";

/**
 * Opens Google/Supabase OAuth in the system secure browser (Chrome Custom Tab / SFSafariViewController).
 * Never navigates the Capacitor WebView — that triggers Google error 403 disallowed_useragent.
 */
export async function openOAuthInAppBrowser(url: string): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    throw new Error("openOAuthInAppBrowser called outside native shell");
  }

  const { Browser } = await import("@capacitor/browser");
  const platform = Capacitor.getPlatform();

  try {
    if (platform === "ios") {
      await Browser.open({
        url,
        presentationStyle: "fullscreen",
      });
      return;
    }

    await Browser.open({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not implemented/i.test(msg)) {
      throw new Error(
        "Could not open the sign-in browser on this device. Try email sign-in or update the app.",
      );
    }
    throw err;
  }
}

/** Closes Custom Tab / Safari VC opened by {@link openOAuthInAppBrowser}. */
export async function closeOAuthInAppBrowser(): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* already closed */
  }
}
