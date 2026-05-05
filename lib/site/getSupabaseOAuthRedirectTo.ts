import { getBrowserAuthRedirectOrigin } from "./getBrowserAuthRedirectOrigin";

/** Must match Android/iOS URL scheme + Supabase Auth "Redirect URLs". */
export const NATIVE_OAUTH_REDIRECT = "com.mappetite.app://auth/callback";

/** Supabase `redirectTo` for OAuth: custom scheme in Capacitor, HTTPS on web. */
export async function getSupabaseOAuthRedirectTo(): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) return NATIVE_OAUTH_REDIRECT;
  } catch {
    /* web */
  }
  const origin = getBrowserAuthRedirectOrigin();
  return origin ? `${origin}/map` : "";
}
