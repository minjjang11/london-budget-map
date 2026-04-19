import { NextResponse, type NextRequest } from "next/server";
import { requireModeratorUser } from "@/lib/moderation/moderationApiAuth";
import { promoteSubmissionToApprovedPlace } from "@/lib/moderation/promoteSubmission";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";
import type { PlaceSubmissionRow } from "@/lib/types/places";

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

  const { data: row, error } = await admin
    .from("place_submissions")
    .select("*")
    .eq("id", submissionId)
    .in("status", ["pending", "needs_review"])
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) {
    return NextResponse.json({ error: "Submission not found or already finalized" }, { status: 404 });
  }

  const res = await promoteSubmissionToApprovedPlace(admin, row as PlaceSubmissionRow);
  if (!res.ok) {
    const status = res.code === "already_final" ? 409 : 500;
    return NextResponse.json({ error: res.message }, { status });
  }

  return NextResponse.json({ ok: true, placeId: res.placeId });
}
