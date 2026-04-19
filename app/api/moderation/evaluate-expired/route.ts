import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthorized, requireModeratorUser } from "@/lib/moderation/moderationApiAuth";
import { runExpiredSubmissionEvaluation } from "@/lib/moderation/runExpiredEvaluation";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    const mod = await requireModeratorUser();
    if (!mod.ok) return mod.response;
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY — cannot run moderation jobs." },
      { status: 503 },
    );
  }

  const summary = await runExpiredSubmissionEvaluation(admin);
  return NextResponse.json(summary);
}
