import { Capacitor } from "@capacitor/core";

export type OpenAppLocationSettingsResult =
  | { ok: true; native: true }
  | { ok: true; native: false; message: string }
  | { ok: false; message: string };

/**
 * Opens OS location / app settings on Capacitor native; on web returns guidance text only.
 */
export async function openAppLocationSettings(): Promise<OpenAppLocationSettingsResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: true,
      native: false,
      message:
        "Allow location for this site in your browser (lock icon in the address bar), then tap Try again.",
    };
  }

  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import("capacitor-native-settings");
    const platform = Capacitor.getPlatform();

    if (platform === "android") {
      try {
        await NativeSettings.openAndroid({ option: AndroidSettings.Location });
        return { ok: true, native: true };
      } catch {
        await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
        return { ok: true, native: true };
      }
    }

    await NativeSettings.openIOS({ option: IOSSettings.App });
    return { ok: true, native: true };
  } catch (err) {
    const platform = Capacitor.getPlatform();
    const fallback =
      platform === "android"
        ? "Open Settings → Location, or Apps → Maimo Map → Permissions → Location → Allow."
        : "Open Settings → Maimo Map → Location → While Using the App.";
    return { ok: false, message: fallback };
  }
}
