"use client";

import { AppLauncher } from "@capacitor/app-launcher";

function walkingDirectionsWebUrl(lat: number, lng: number): string {
  const d = `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}&travelmode=walking`;
}

function googleMapsAppUrl(lat: number, lng: number): string {
  return `comgooglemaps://?daddr=${lat},${lng}&directionsmode=walking`;
}

async function openHttpsDirections(lat: number, lng: number): Promise<void> {
  const webUrl = walkingDirectionsWebUrl(lat, lng);
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: webUrl });
  } catch {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}

/**
 * Opens Google Maps directions outside the WebView.
 * iOS: try `comgooglemaps://` via App Launcher, then HTTPS fallback.
 * Android: HTTPS only (Custom Tab / browser).
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

  if (Capacitor.getPlatform() === "android") {
    await openHttpsDirections(lat, lng);
    return;
  }

  // iOS — try native Google Maps app, then HTTPS (LSApplicationQueriesSchemes: comgooglemaps).
  const appUrl = googleMapsAppUrl(lat, lng);
  try {
    const { value } = await AppLauncher.canOpenUrl({ url: appUrl });
    if (value) {
      const { completed } = await AppLauncher.openUrl({ url: appUrl });
      if (completed) return;
    }
  } catch {
    try {
      const { completed } = await AppLauncher.openUrl({ url: appUrl });
      if (completed) return;
    } catch {
      /* fall through to HTTPS */
    }
  }

  await openHttpsDirections(lat, lng);
}
