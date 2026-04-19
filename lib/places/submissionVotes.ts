import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { SubmissionVoteType } from "../types/submissionEngagement";

export type VoteTally = { up: number; down: number };

/** Aggregate counts + current user's vote per submission id. */
export async function fetchSubmissionVoteData(
  client: SupabaseClient<Database>,
  submissionIds: string[],
  currentUserId: string | null,
): Promise<{
  tallies: Map<string, VoteTally>;
  myVote: Map<string, SubmissionVoteType>;
  error: string | null;
}> {
  const tallies = new Map<string, VoteTally>();
  const myVote = new Map<string, SubmissionVoteType>();
  if (submissionIds.length === 0) return { tallies, myVote, error: null };

  const { data, error } = await client
    .from("submission_votes")
    .select("submission_id, user_id, vote_type")
    .in("submission_id", submissionIds);

  if (error) return { tallies, myVote, error: error.message };

  for (const id of submissionIds) tallies.set(id, { up: 0, down: 0 });

  for (const row of data ?? []) {
    const sid = row.submission_id as string;
    const t = tallies.get(sid) ?? { up: 0, down: 0 };
    if (row.vote_type === "upvote") t.up += 1;
    else t.down += 1;
    tallies.set(sid, t);
    if (currentUserId && row.user_id === currentUserId) {
      myVote.set(sid, row.vote_type as SubmissionVoteType);
    }
  }

  return { tallies, myVote, error: null };
}

export async function upsertSubmissionVote(
  client: SupabaseClient<Database>,
  submissionId: string,
  userId: string,
  voteType: SubmissionVoteType,
): Promise<{ error: string | null }> {
  const { error } = await client.from("submission_votes").upsert(
    {
      submission_id: submissionId,
      user_id: userId,
      vote_type: voteType,
    },
    { onConflict: "submission_id,user_id" },
  );
  if (error) return { error: error.message };
  return { error: null };
}

export async function removeSubmissionVote(
  client: SupabaseClient<Database>,
  submissionId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await client.from("submission_votes").delete().eq("submission_id", submissionId).eq("user_id", userId);
  if (error) return { error: error.message };
  return { error: null };
}
