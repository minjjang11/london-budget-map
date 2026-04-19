import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceSubmissionRow } from "../types/places";
import { submissionRowToPlaceInsert } from "./submissionToPlaceInsert";

export type PromoteResult =
  | { ok: true; placeId: string }
  | { ok: false; message: string; code?: "already_final" | "db" };

/**
 * Inserts `places` then marks submission `approved`. Rolls back the place row if the status update fails.
 * Caller must use a client that bypasses RLS (service role).
 */
export async function promoteSubmissionToApprovedPlace(
  admin: SupabaseClient<Database>,
  sub: PlaceSubmissionRow,
): Promise<PromoteResult> {
  if (sub.status === "approved") {
    return { ok: false, message: "Already approved", code: "already_final" };
  }
  if (sub.status === "rejected") {
    return { ok: false, message: "Submission was rejected", code: "already_final" };
  }

  const payload = submissionRowToPlaceInsert(sub);
  const { data: placeRow, error: insErr } = await admin.from("places").insert(payload).select("id").single();

  if (insErr || !placeRow?.id) {
    return { ok: false, message: insErr?.message ?? "Insert failed", code: "db" };
  }

  const placeId = placeRow.id as string;

  const { data: updated, error: upErr } = await admin
    .from("place_submissions")
    .update({ status: "approved" })
    .eq("id", sub.id)
    .in("status", ["pending", "needs_review"])
    .select("id");

  if (upErr || !updated?.length) {
    await admin.from("places").delete().eq("id", placeId);
    return { ok: false, message: upErr?.message ?? "Could not finalize submission status", code: "db" };
  }

  return { ok: true, placeId };
}
