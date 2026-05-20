import { getMyLocation } from "./getMyLocation";

/** Quick probe — true when a location fix is obtained. */
export async function probeGeolocationPermission(): Promise<boolean> {
  const result = await getMyLocation();
  return result.ok;
}
