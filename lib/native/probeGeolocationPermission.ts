/** Quick geolocation probe — resolves true when a fix is obtained. */
export function probeGeolocationPermission(
  timeoutMs = 6000,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
