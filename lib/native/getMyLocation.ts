import { Capacitor } from "@capacitor/core";

export type MyLocationFailureReason = "denied" | "unavailable" | "timeout" | "unsupported";

export type GetMyLocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: MyLocationFailureReason };

function mapNativeError(err: unknown): MyLocationFailureReason {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message).toLowerCase()
      : "";
  if (msg.includes("denied") || msg.includes("permission")) return "denied";
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  return "unavailable";
}

function mapWebError(code: number): MyLocationFailureReason {
  if (code === 1) return "denied";
  if (code === 2) return "unavailable";
  if (code === 3) return "timeout";
  return "unavailable";
}

function isLocationGranted(perm: {
  location?: string;
  coarseLocation?: string;
}): boolean {
  return perm.location === "granted" || perm.coarseLocation === "granted";
}

function isLocationDenied(perm: {
  location?: string;
  coarseLocation?: string;
}): boolean {
  return (
    perm.location === "denied" &&
    (perm.coarseLocation === "denied" || perm.coarseLocation === undefined)
  );
}

async function getMyLocationNative(): Promise<GetMyLocationResult> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");

    let perm = await Geolocation.checkPermissions();
    if (!isLocationGranted(perm)) {
      perm = await Geolocation.requestPermissions();
    }
    if (isLocationDenied(perm)) {
      return { ok: false, reason: "denied" };
    }

    const tryPosition = async (enableHighAccuracy: boolean) => {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy,
        timeout: enableHighAccuracy ? 15_000 : 20_000,
        maximumAge: 60_000,
      });
      return { ok: true as const, lat: pos.coords.latitude, lng: pos.coords.longitude };
    };

    try {
      return await tryPosition(true);
    } catch (err) {
      const reason = mapNativeError(err);
      if (reason === "timeout" || reason === "unavailable") {
        try {
          return await tryPosition(false);
        } catch (retryErr) {
          return { ok: false, reason: mapNativeError(retryErr) };
        }
      }
      return { ok: false, reason };
    }
  } catch {
    return getMyLocationWeb();
  }
}

function getMyLocationWeb(): Promise<GetMyLocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (error) => resolve({ ok: false, reason: mapWebError(error.code) }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

/** Current device location — native plugin on Capacitor, `navigator.geolocation` on web. */
export async function getMyLocation(): Promise<GetMyLocationResult> {
  if (Capacitor.isNativePlatform()) {
    return getMyLocationNative();
  }
  return getMyLocationWeb();
}
