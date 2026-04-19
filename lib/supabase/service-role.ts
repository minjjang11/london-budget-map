import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/** Server-only. Bypasses RLS — use only in trusted API routes / jobs. */
export function createServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
