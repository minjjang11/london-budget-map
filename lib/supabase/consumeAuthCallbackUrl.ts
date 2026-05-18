import type { SupabaseClient } from "@supabase/supabase-js";

function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "production") return;
  console.log("[auth:oauth-callback]", ...args);
}

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
    const { data: existing } = await client.auth.getSession();
    if (existing.session) {
      devLog("session already present — skip exchange");
      return { ok: true, error: null };
    }

    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      devLog("exchangeCodeForSession succeeded");
      return { ok: true, error: null };
    }
    devLog("exchangeCodeForSession failed:", error.message);
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData.session && isOAuthCodeReuseError(error.message)) {
      devLog("exchangeCodeForSession: code reuse but session exists");
      return { ok: true, error: null };
    }
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

/** PKCE `code` was already exchanged (e.g. native deep link then Custom Tab hits HTTPS callback). */
export function isOAuthCodeReuseError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("invalid") && m.includes("code")) ||
    m.includes("expired") ||
    m.includes("already been used") ||
    m.includes("already used") ||
    m.includes("redeemed") ||
    (m.includes("grant") && m.includes("invalid"))
  );
}
