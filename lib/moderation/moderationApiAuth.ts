import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/server-route";
import { isModeratorEmail } from "./isModerator";

export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.MODERATION_CRON_SECRET?.trim();
  if (!secret) return false;
  const authz = request.headers.get("authorization");
  return authz === `Bearer ${secret}`;
}

/** @returns user when moderator session; null when unauthorized; Response for early return */
export async function requireModeratorUser(): Promise<
  { ok: true; email: string } | { ok: false; response: Response }
> {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.email) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    if (!isModeratorEmail(user.email)) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ok: true, email: user.email };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }
}
