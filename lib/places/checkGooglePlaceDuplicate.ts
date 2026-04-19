import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type DuplicateKind = "approved" | "pending";

export type GooglePlaceDuplicateResult = {
  hasDuplicate: boolean;
  kind: DuplicateKind | null;
  /** Existing row display name when known. */
  existingName: string | null;
};

/**
 * Client-side duplicate probe (respects RLS). Skips when `googlePlaceId` is empty.
 * Checks pending submissions first, then approved `places`.
 */
export async function checkGooglePlaceDuplicate(
  client: SupabaseClient<Database>,
  googlePlaceId: string | null | undefined,
): Promise<{ ok: true; result: GooglePlaceDuplicateResult } | { ok: false; message: string }> {
  const id = googlePlaceId?.trim();
  if (!id) {
    return { ok: true, result: { hasDuplicate: false, kind: null, existingName: null } };
  }

  const { data: pendingRows, error: pe } = await client
    .from("place_submissions")
    .select("place_name")
    .eq("google_place_id", id)
    .in("status", ["pending", "needs_review"])
    .limit(1);

  if (pe) return { ok: false, message: pe.message };

  const pending = pendingRows?.[0];
  if (pending) {
    return {
      ok: true,
      result: {
        hasDuplicate: true,
        kind: "pending",
        existingName: pending.place_name ?? null,
      },
    };
  }

  const { data: approvedRows, error: ae } = await client
    .from("places")
    .select("name")
    .eq("google_place_id", id)
    .eq("status", "approved")
    .limit(1);

  if (ae) return { ok: false, message: ae.message };

  const approved = approvedRows?.[0];
  if (approved) {
    return {
      ok: true,
      result: {
        hasDuplicate: true,
        kind: "approved",
        existingName: approved.name ?? null,
      },
    };
  }

  return { ok: true, result: { hasDuplicate: false, kind: null, existingName: null } };
}
