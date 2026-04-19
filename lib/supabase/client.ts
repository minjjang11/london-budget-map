import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";
import type { Database } from "../types/database";

let browserClient: SupabaseClient<Database> | null | undefined;

/**
 * Browser client with persisted auth session (cookies via @supabase/ssr).
 * Returns null when env is missing or during SSR.
 */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;
  if (browserClient !== undefined) return browserClient;
  browserClient = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    isSingleton: true,
  }) as unknown as SupabaseClient<Database>;
  return browserClient;
}
