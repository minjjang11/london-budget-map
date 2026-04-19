import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

/** Returns place ids the signed-in user has saved (RLS: own rows only). */
export async function fetchMySavedPlaceIds(
  client: SupabaseClient<Database>,
): Promise<{ ids: string[]; error: string | null }> {
  const { data, error } = await client.from("saved_places").select("place_id");
  if (error) return { ids: [], error: error.message };
  const ids = (data ?? []).map((r) => r.place_id as string);
  return { ids, error: null };
}

export async function insertSavedPlace(
  client: SupabaseClient<Database>,
  placeId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await client.from("saved_places").insert({
    place_id: placeId,
    user_id: userId,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteSavedPlace(
  client: SupabaseClient<Database>,
  placeId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await client.from("saved_places").delete().eq("place_id", placeId).eq("user_id", userId);
  if (error) return { error: error.message };
  return { error: null };
}
