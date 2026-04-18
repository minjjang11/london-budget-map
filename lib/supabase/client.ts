import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";
import type { Database } from "../types/database";

let browserClient: SupabaseClient<Database> | null | undefined;

/**
 * Singleton browser client. Returns null when env is missing so the app can run without Supabase.
 */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  if (browserClient !== undefined) return browserClient;
  browserClient = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return browserClient;
}
