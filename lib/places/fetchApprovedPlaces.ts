import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceRow } from "../types/places";
import { mapPlaceRowToSpot } from "./mapPlaceRowToSpot";
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
  return { ok: true, spots: rows.map(mapPlaceRowToSpot) };
}
