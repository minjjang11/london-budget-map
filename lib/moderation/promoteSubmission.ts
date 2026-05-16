import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceSubmissionRow } from "../types/places";

export type PromoteResult =
  | { ok: true; placeId: string }
  | { ok: false; message: string; code?: "already_final" | "db" };

/**
 * Sets submission to `approved`. A DB trigger (`021_submission_approve_sync_places.sql`) inserts
 * `public.places` when no dedupe match exists (google_place_id, lat/lng+name, or name+address).
 * Caller must use a client that bypasses RLS (service role).
 *
 * If the row is already approved (e.g. manual SQL), calls `sync_place_for_approved_submission` to
 * repair a missing `places` row idempotently.
 */
export async function promoteSubmissionToApprovedPlace(
  admin: SupabaseClient<Database>,
  sub: PlaceSubmissionRow,
): Promise<PromoteResult> {
  if (sub.status === "rejected") {
    return { ok: false, message: "Submission was rejected", code: "already_final" };
  }

  if (sub.status === "approved") {
    const { data: placeId, error } = await admin.rpc("sync_place_for_approved_submission", {
      p_submission_id: sub.id,
    });
    if (error) return { ok: false, message: error.message, code: "db" };
    if (!placeId || typeof placeId !== "string") {
      return { ok: false, message: "Could not ensure map row for this submission", code: "db" };
    }
    return { ok: true, placeId };
  }

  const { data: updated, error: upErr } = await admin
    .from("place_submissions")
    .update({ status: "approved" })
    .eq("id", sub.id)
    .in("status", ["pending", "needs_review"])
    .select("id");

  if (upErr || !updated?.length) {
    return { ok: false, message: upErr?.message ?? "Could not approve submission", code: "db" };
  }

  const { data: placeId, error: syncErr } = await admin.rpc("sync_place_for_approved_submission", {
    p_submission_id: sub.id,
  });
  if (syncErr || !placeId || typeof placeId !== "string") {
    return {
      ok: false,
      message: syncErr?.message ?? "Approved submission but could not resolve places row (run migration 021?)",
      code: "db",
    };
  }

  return { ok: true, placeId };
}
