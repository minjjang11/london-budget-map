import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/server-route";
import { isModeratorEmail } from "@/lib/moderation/isModerator";

export async function GET() {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const moderator = Boolean(user?.email && isModeratorEmail(user.email));
    return NextResponse.json({ moderator });
  } catch {
    return NextResponse.json({ moderator: false });
  }
}
