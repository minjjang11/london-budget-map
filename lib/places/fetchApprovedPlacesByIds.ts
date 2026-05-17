import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceRow } from "../types/places";
import type { Spot } from "../types/spot";
import { mapPlaceRowToSpot } from "./mapPlaceRowToSpot";

/** Loads approved `places` rows by id (e.g. account bookmarks not yet in the map list). */
export async function fetchApprovedPlacesByIds(
  client: SupabaseClient<Database>,
  ids: string[],
): Promise<{ spots: Spot[]; error: string | null }> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { spots: [], error: null };

  const { data, error } = await client
    .from("places")
    .select("*")
    .in("id", unique)
    .eq("status", "approved");

  if (error) return { spots: [], error: error.message };
  const spots = ((data ?? []) as PlaceRow[]).map(mapPlaceRowToSpot);
  return { spots, error: null };
}
