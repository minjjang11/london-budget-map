import { NextResponse, type NextRequest } from "next/server";
import { requireModeratorUser } from "@/lib/moderation/moderationApiAuth";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  const mod = await requireModeratorUser();
  if (!mod.ok) return mod.response;

  let body: { submissionId?: string };
  try {
    body = (await request.json()) as { submissionId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const submissionId = body.submissionId?.trim();
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("place_submissions")
    .update({ status: "rejected" })
    .eq("id", submissionId)
    .in("status", ["pending", "needs_review"])
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) {
    return NextResponse.json({ error: "Submission not found or already finalized" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
