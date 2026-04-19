import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceSubmissionRow } from "../types/places";

export type FetchPendingSubmissionsResult =
  | { ok: true; rows: PlaceSubmissionRow[] }
  | { ok: false; rows: PlaceSubmissionRow[]; message: string };

export async function fetchPendingPlaceSubmissions(
  client: SupabaseClient<Database>,
): Promise<FetchPendingSubmissionsResult> {
  const { data, error } = await client
    .from("place_submissions")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  if (error) return { ok: false, rows: [], message: error.message };
  return { ok: true, rows: (data ?? []) as PlaceSubmissionRow[] };
}
