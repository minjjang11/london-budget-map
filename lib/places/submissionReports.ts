import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function insertSubmissionReport(
  client: SupabaseClient<Database>,
  submissionId: string,
  userId: string,
  reason: string | null,
): Promise<{ error: string | null }> {
  const { error } = await client.from("submission_reports").insert({
    submission_id: submissionId,
    user_id: userId,
    reason: reason?.trim() || null,
  });
  if (error) return { error: error.message };
  return { error: null };
}
