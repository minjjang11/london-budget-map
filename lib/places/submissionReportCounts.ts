import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

/** Totals only; does not expose who reported (see migration 010 RPC). */
export async function fetchPendingSubmissionReportCounts(
  client: SupabaseClient<Database>,
  submissionIds: string[],
): Promise<{ counts: Map<string, number>; error: string | null }> {
  const counts = new Map<string, number>();
  if (submissionIds.length === 0) return { counts, error: null };

  const { data, error } = await client.rpc("pending_submission_report_counts", {
    p_ids: submissionIds,
  });

  if (error) return { counts, error: error.message };

  for (const row of data ?? []) {
    const rec = row as { submission_id: string; report_count: number };
    counts.set(rec.submission_id, Number(rec.report_count) || 0);
  }
  return { counts, error: null };
}
