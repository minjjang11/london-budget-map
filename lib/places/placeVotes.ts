import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceVoteType } from "../types/placeEngagement";

export type PlaceVoteTally = { up: number; down: number };

/** Aggregate counts + current user vote per place id (approved places only via RLS). */
export async function fetchPlaceVoteData(
  client: SupabaseClient<Database>,
  placeIds: string[],
  currentUserId: string | null,
): Promise<{
  tallies: Map<string, PlaceVoteTally>;
  myVote: Map<string, PlaceVoteType>;
  error: string | null;
}> {
  const tallies = new Map<string, PlaceVoteTally>();
  const myVote = new Map<string, PlaceVoteType>();
  if (placeIds.length === 0) return { tallies, myVote, error: null };

  const { data, error } = await client
    .from("place_votes")
    .select("place_id, user_id, vote_type")
    .in("place_id", placeIds);

  if (error) return { tallies, myVote, error: error.message };

  for (const id of placeIds) tallies.set(id, { up: 0, down: 0 });

  for (const row of data ?? []) {
    const pid = row.place_id as string;
    const t = tallies.get(pid) ?? { up: 0, down: 0 };
    if (row.vote_type === "upvote") t.up += 1;
    else t.down += 1;
    tallies.set(pid, t);
    if (currentUserId && row.user_id === currentUserId) {
      myVote.set(pid, row.vote_type as PlaceVoteType);
    }
  }

  return { tallies, myVote, error: null };
}

export async function upsertPlaceVote(
  client: SupabaseClient<Database>,
  placeId: string,
  userId: string,
  voteType: PlaceVoteType,
): Promise<{ error: string | null }> {
  const { error } = await client.from("place_votes").upsert(
    {
      place_id: placeId,
      user_id: userId,
      vote_type: voteType,
    },
    { onConflict: "place_id,user_id" },
  );
  if (error) return { error: error.message };
  return { error: null };
}

export async function removePlaceVote(
  client: SupabaseClient<Database>,
  placeId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await client.from("place_votes").delete().eq("place_id", placeId).eq("user_id", userId);
  if (error) return { error: error.message };
  return { error: null };
}
