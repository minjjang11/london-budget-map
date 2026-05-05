import type { SupabaseClient } from "@supabase/supabase-js";

/** Pull query + hash fragments into one param bag (OAuth code / implicit tokens). */
function parseAuthParamsFromDeepLink(rawUrl: string): URLSearchParams {
  const out = new URLSearchParams();
  try {
    const hashMark = rawUrl.indexOf("#");
    const qMark = rawUrl.indexOf("?");
    if (qMark >= 0) {
      const end = hashMark > qMark ? hashMark : rawUrl.length;
      const qs = rawUrl.slice(qMark + 1, end);
      new URLSearchParams(qs).forEach((v, k) => out.set(k, v));
    }
    if (hashMark >= 0) {
      const frag = rawUrl.slice(hashMark + 1);
      new URLSearchParams(frag).forEach((v, k) => out.set(k, v));
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * Complete OAuth / magic-link return inside the Capacitor WebView.
 * Supports PKCE (`?code=`) and implicit/hash tokens (`#access_token=`).
 */
export async function consumeAuthTokensFromUrl(
  client: SupabaseClient,
  rawUrl: string,
): Promise<{ ok: boolean; error: string | null }> {
  const params = parseAuthParamsFromDeepLink(rawUrl);

  const oauthErr = params.get("error_description") ?? params.get("error");
  if (oauthErr) {
    return { ok: false, error: oauthErr };
  }

  const code = params.get("code");
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return { ok: true, error: null };
    return { ok: false, error: error.message };
  }

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await client.auth.setSession({ access_token, refresh_token });
    if (!error) return { ok: true, error: null };
    return { ok: false, error: error.message };
  }

  return { ok: false, error: null };
}
