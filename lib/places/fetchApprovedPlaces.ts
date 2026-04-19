import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceRow } from "../types/places";
import { mapPlaceRowToSpot } from "./mapPlaceRowToSpot";
import { fetchPlaceVoteData } from "./placeVotes";
import type { Spot } from "../types/spot";

export type FetchApprovedPlacesResult =
  | { ok: true; spots: Spot[] }
  | { ok: false; spots: Spot[]; message: string };

/** Loads approved rows for map + lists. Caller supplies browser Supabase client. */
export async function fetchApprovedPlaces(client: SupabaseClient<Database>): Promise<FetchApprovedPlacesResult> {
  const { data, error } = await client
    .from("places")
    .select("*")
    .eq("status", "approved")
    .order("name", { ascending: true });

  if (error) {
    return { ok: false, spots: [], message: error.message };
  }

  const rows = (data ?? []) as PlaceRow[];
  const ids = rows.map((r) => r.id);
  const { tallies, error: voteErr } = await fetchPlaceVoteData(client, ids, null);
  if (voteErr) {
    console.warn("[budget-map] place_votes aggregate:", voteErr);
    return { ok: true, spots: rows.map(mapPlaceRowToSpot) };
  }

  const spots: Spot[] = rows.map((row) => {
    const spot = mapPlaceRowToSpot(row);
    const t = tallies.get(row.id);
    if (t) {
      spot.upvotes = t.up;
      spot.downvotes = t.down;
    } else {
      spot.upvotes = 0;
      spot.downvotes = 0;
    }
    return spot;
  });

  return { ok: true, spots };
}
