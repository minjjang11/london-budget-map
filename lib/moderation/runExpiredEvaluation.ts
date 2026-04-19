import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { PlaceSubmissionRow } from "../types/places";
import { aggregateEngagementBySubmissionId } from "./engagementAggregates";
import { evaluateExpiredPendingSubmission } from "./moderationRules";
import { promoteSubmissionToApprovedPlace } from "./promoteSubmission";

export type ExpiredEvaluationSummary = {
  scanned: number;
  autoApproved: number;
  movedToNeedsReview: number;
  errors: string[];
};

/**
 * For each `pending` submission past `review_ends_at`, either auto-approve (creates `places` row)
 * or set status to `needs_review`.
 */
export async function runExpiredSubmissionEvaluation(
  admin: SupabaseClient<Database>,
): Promise<ExpiredEvaluationSummary> {
  const summary: ExpiredEvaluationSummary = {
    scanned: 0,
    autoApproved: 0,
    movedToNeedsReview: 0,
    errors: [],
  };

  const nowIso = new Date().toISOString();
  const { data: subs, error } = await admin
    .from("place_submissions")
    .select("*")
    .eq("status", "pending")
    .lt("review_ends_at", nowIso);

  if (error) {
    summary.errors.push(error.message);
    return summary;
  }

  const rows = (subs ?? []) as PlaceSubmissionRow[];
  summary.scanned = rows.length;
  if (rows.length === 0) return summary;

  const ids = rows.map((r) => r.id);
  const agg = await aggregateEngagementBySubmissionId(admin, ids);

  for (const sub of rows) {
    const counts = agg.get(sub.id) ?? { upvotes: 0, downvotes: 0, reportCount: 0 };
    const outcome = evaluateExpiredPendingSubmission({
      upvotes: counts.upvotes,
      downvotes: counts.downvotes,
      reportCount: counts.reportCount,
    });

    if (outcome === "approved") {
      const res = await promoteSubmissionToApprovedPlace(admin, sub);
      if (res.ok) {
        summary.autoApproved += 1;
      } else if (res.code === "already_final") {
        /* concurrent handler */
      } else {
        summary.errors.push(`${sub.id}: ${res.message}`);
      }
      continue;
    }

    const { error: upErr } = await admin
      .from("place_submissions")
      .update({ status: "needs_review" })
      .eq("id", sub.id)
      .eq("status", "pending");

    if (upErr) summary.errors.push(`${sub.id}: ${upErr.message}`);
    else summary.movedToNeedsReview += 1;
  }

  return summary;
}
