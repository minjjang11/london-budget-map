/**
 * Public anon client only — safe for browser. Never put service role keys in NEXT_PUBLIC_*.
 */

/** Must be `https://<ref>.supabase.co` — never `/rest/v1` (REST base breaks `/auth/v1` OAuth URLs). */
function normalizeSupabaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  u = u.replace(/\/rest\/v1\/?$/i, "");
  return u.replace(/\/+$/, "");
}

function normalizeAnonKey(raw: string): string {
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

export function getSupabaseUrl(): string {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
}

export function getSupabaseAnonKey(): string {
  return normalizeAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
