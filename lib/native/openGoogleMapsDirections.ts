"use client";

function walkingDirectionsWebUrl(lat: number, lng: number): string {
  const d = `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}&travelmode=walking`;
}

function googleMapsAppUrl(lat: number, lng: number): string {
  return `comgooglemaps://?daddr=${lat},${lng}&directionsmode=walking`;
}

/** Android intent URL when `comgooglemaps://` is blocked but Maps is installed. */
function googleMapsAndroidIntentUrl(lat: number, lng: number): string {
  const d = `${lat},${lng}`;
  return (
    `intent://maps.google.com/maps?daddr=${encodeURIComponent(d)}` +
    `#Intent;scheme=https;package=com.google.android.apps.maps;end`
  );
}

/**
 * Opens Google Maps directions outside the WebView when possible.
 * iOS: `comgooglemaps://` if installed (requires LSApplicationQueriesSchemes), else HTTPS in Browser.
 * Android: app scheme / intent, else HTTPS in Browser (Custom Tab).
 */
export async function openGoogleMapsDirections(lat: number, lng: number): Promise<void> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const webUrl = walkingDirectionsWebUrl(lat, lng);

  if (typeof window === "undefined") {
    return;
  }

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    window.open(webUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const platform = Capacitor.getPlatform();
  const candidates =
    platform === "android"
      ? [googleMapsAppUrl(lat, lng), googleMapsAndroidIntentUrl(lat, lng)]
      : [googleMapsAppUrl(lat, lng)];

  try {
    const { App } = await import("@capacitor/app");
    for (const url of candidates) {
      const { value: canOpen } = await App.canOpenUrl({ url });
      if (canOpen) {
        await App.openUrl({ url });
        return;
      }
    }
  } catch {
    /* fall through to browser */
  }

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: webUrl });
    return;
  } catch {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}
