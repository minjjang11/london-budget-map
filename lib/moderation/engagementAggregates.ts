import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type SubmissionEngagementCounts = { upvotes: number; downvotes: number; reportCount: number };

/** Service-role or any client that can read all vote/report rows for the given submission ids. */
export async function aggregateEngagementBySubmissionId(
  admin: SupabaseClient<Database>,
  submissionIds: string[],
): Promise<Map<string, SubmissionEngagementCounts>> {
  const map = new Map<string, SubmissionEngagementCounts>();
  for (const id of submissionIds) {
    map.set(id, { upvotes: 0, downvotes: 0, reportCount: 0 });
  }
  if (submissionIds.length === 0) return map;

  const [{ data: votes }, { data: reports }] = await Promise.all([
    admin.from("submission_votes").select("submission_id, vote_type").in("submission_id", submissionIds),
    admin.from("submission_reports").select("submission_id").in("submission_id", submissionIds),
  ]);

  for (const row of votes ?? []) {
    const sid = row.submission_id as string;
    const cur = map.get(sid);
    if (!cur) continue;
    if (row.vote_type === "upvote") cur.upvotes += 1;
    else if (row.vote_type === "downvote") cur.downvotes += 1;
  }

  for (const row of reports ?? []) {
    const sid = row.submission_id as string;
    const cur = map.get(sid);
    if (!cur) continue;
    cur.reportCount += 1;
  }

  return map;
}
