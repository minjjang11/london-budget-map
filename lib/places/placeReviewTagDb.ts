import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { sanitizePlaceReviewTagSlugs } from "./placeReviewTags";

/** place_id -> tag_key -> count (approved places only via RLS). */
export async function fetchPlaceReviewTagCountsByPlace(
  client: SupabaseClient<Database>,
  placeIds: string[],
): Promise<{ byPlace: Map<string, Record<string, number>>; error: string | null }> {
  const byPlace = new Map<string, Record<string, number>>();
  if (placeIds.length === 0) return { byPlace, error: null };

  const { data, error } = await client
    .from("place_review_tags")
    .select("place_id, tag_key")
    .in("place_id", placeIds);

  if (error) return { byPlace, error: error.message };

  for (const id of placeIds) byPlace.set(id, {});

  for (const row of data ?? []) {
    const pid = row.place_id as string;
    const key = row.tag_key as string;
    const cur = byPlace.get(pid) ?? {};
    cur[key] = (cur[key] ?? 0) + 1;
    byPlace.set(pid, cur);
  }

  return { byPlace, error: null };
}

export async function fetchMyPlaceReviewTags(
  client: SupabaseClient<Database>,
  placeId: string,
  userId: string,
): Promise<{ tags: string[]; error: string | null }> {
  const { data, error } = await client
    .from("place_review_tags")
    .select("tag_key")
    .eq("place_id", placeId)
    .eq("user_id", userId);

  if (error) return { tags: [], error: error.message };
  const tags = (data ?? []).map((r) => r.tag_key as string);
  return { tags, error: null };
}

/** Replaces the signed-in user's tags for this place (0–3 allowed slugs). */
export async function replaceMyPlaceReviewTags(
  client: SupabaseClient<Database>,
  placeId: string,
  userId: string,
  tagSlugs: string[],
): Promise<{ error: string | null }> {
  const slugs = sanitizePlaceReviewTagSlugs(tagSlugs);
  const { error: delErr } = await client.from("place_review_tags").delete().eq("place_id", placeId).eq("user_id", userId);
  if (delErr) return { error: delErr.message };
  if (slugs.length === 0) return { error: null };

  const rows = slugs.map((tag_key) => ({ place_id: placeId, user_id: userId, tag_key }));
  const { error: insErr } = await client.from("place_review_tags").insert(rows);
  if (insErr) return { error: insErr.message };
  return { error: null };
}
