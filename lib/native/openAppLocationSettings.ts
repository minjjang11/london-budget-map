import { Capacitor } from "@capacitor/core";

export type OpenAppLocationSettingsResult =
  | { ok: true; native: true }
  | { ok: true; native: false; message: string }
  | { ok: false; message: string };

/**
 * Opens OS app settings on Capacitor native; on web returns guidance text only.
 */
export async function openAppLocationSettings(): Promise<OpenAppLocationSettingsResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: true,
      native: false,
      message: "Please enable location permission in your browser settings.",
    };
  }

  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import("capacitor-native-settings");
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
    return { ok: true, native: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Could not open settings.";
    const platform = Capacitor.getPlatform();
    const fallback =
      platform === "android"
        ? "Open Settings → Apps → Maimo Map → Permissions → Location → Allow."
        : "Open Settings → Maimo Map → Location → While Using the App.";
    return { ok: false, message: fallback || detail };
  }
}
