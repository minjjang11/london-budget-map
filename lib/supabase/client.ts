import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";
import type { Database } from "../types/database";

let browserClient: SupabaseClient<Database> | null | undefined;

function isCapacitorNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        getPlatform?: () => string;
      };
    }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    const platform = cap?.getPlatform?.();
    return platform === "ios" || platform === "android";
  } catch {
    return false;
  }
}

/**
 * Browser client with persisted auth session (cookies via @supabase/ssr).
 * Capacitor native uses localStorage-backed auth because cookie storage is unreliable in the app WebView.
 * Returns null when env is missing or during SSR.
 */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;
  if (browserClient !== undefined) return browserClient;

  if (isCapacitorNativeRuntime()) {
    browserClient = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
        storage: window.localStorage,
        storageKey: "maimomap-auth-token",
      },
    }) as unknown as SupabaseClient<Database>;
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    isSingleton: true,
  }) as unknown as SupabaseClient<Database>;
  return browserClient;
}
