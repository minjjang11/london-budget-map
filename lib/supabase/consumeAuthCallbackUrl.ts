import type { SupabaseClient } from "@supabase/supabase-js";

/** Parse `access_token` / `refresh_token` from a URL hash (OAuth / magic link). */
export async function consumeAuthTokensFromUrl(
  client: SupabaseClient,
  rawUrl: string,
): Promise<{ ok: boolean; error: string | null }> {
  const hashIdx = rawUrl.indexOf("#");
  if (hashIdx === -1) return { ok: false, error: null };
  const hash = rawUrl.slice(hashIdx + 1);
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return { ok: false, error: null };
  const { error } = await client.auth.setSession({ access_token, refresh_token });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}
