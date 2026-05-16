import type { Session } from "@supabase/supabase-js";
import { getSupabaseAnonKey } from "@/lib/supabase/config";
import { moderationRequestUrl } from "./moderationRequestUrl";

/** Browser calls to moderation: same-origin `/api/moderation/*` (cookies) or Supabase Edge (`NEXT_PUBLIC_MODERATION_API_BASE_URL`). */
export function moderationFetch(
  session: Session | null,
  action: "approve" | "reject" | "evaluate-expired" | "me",
  init: RequestInit = {},
): Promise<Response> {
  const url = moderationRequestUrl(action);
  const edge = url.startsWith("http");
  const headers = new Headers(init.headers ?? {});
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (edge) {
    headers.set("apikey", getSupabaseAnonKey());
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: edge ? "omit" : "include",
  });
}
