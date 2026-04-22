import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceContributionInsert, PlaceContributionRow } from "../types/placeContributions";

export async function fetchPlaceContributions(
  client: SupabaseClient<Database>,
  placeIds: string[],
): Promise<{ rows: PlaceContributionRow[]; error: string | null }> {
  if (placeIds.length === 0) return { rows: [], error: null };
  const { data, error } = await client
    .from("place_contributions")
    .select("*")
    .in("place_id", placeIds)
    .order("created_at", { ascending: false });
  return { rows: (data ?? []) as PlaceContributionRow[], error: error?.message ?? null };
}

export async function fetchMyPlaceContributions(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ rows: PlaceContributionRow[]; error: string | null }> {
  const { data, error } = await client
    .from("place_contributions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { rows: (data ?? []) as PlaceContributionRow[], error: error?.message ?? null };
}

export async function insertPlaceContribution(
  client: SupabaseClient<Database>,
  input: PlaceContributionInsert,
): Promise<{ row: PlaceContributionRow | null; error: string | null }> {
  const { data, error } = await client.from("place_contributions").insert(input).select("*").single();
  return { row: (data as PlaceContributionRow | null) ?? null, error: error?.message ?? null };
}

export async function deletePlaceContribution(
  client: SupabaseClient<Database>,
  contributionId: string,
): Promise<{ error: string | null }> {
  const { error } = await client.from("place_contributions").delete().eq("id", contributionId);
  return { error: error?.message ?? null };
}
