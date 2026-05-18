import { getSupabaseAnonKey, getSupabaseUrl } from "./config";

/**
 * `/auth/v1/authorize` must include `apikey` (anon). If it's missing, the first hop can fail
 * or redirect oddly (some in-app browsers strip query strings).
 */
export function ensureSupabaseOAuthAuthorizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = getSupabaseUrl();
    if (!base) return url;
    const origin = new URL(base).origin;
    if (u.origin !== origin) return url;
    const anon = getSupabaseAnonKey();
    if (!anon) return url;
    if (!u.searchParams.has("apikey")) {
      u.searchParams.set("apikey", anon);
    }
    return u.toString();
  } catch {
    return url;
  }
}
