/**
 * Central moderation thresholds — do not duplicate these in UI.
 * Used by server-side evaluation (expired pending) and available for tests / admin tooling.
 */

export type SubmissionModerationBucket = "approved" | "needs_review" | "rejected";

/** Outcome of automatic evaluation when the community review window has ended. */
export type AutoEvaluationOutcome = "approved" | "needs_review";

export const MODERATION_RULES = {
  /** After `review_ends_at`, a still-`pending` row is evaluated with these gates for auto-approve. */
  autoApproveAfterExpiry: {
    minUpvotes: 4,
    minTotalVotes: 4,
    minUpvoteRatio: 0.65,
    maxReports: 0,
  },
} as const;

export type EngagementSignals = {
  upvotes: number;
  downvotes: number;
  reportCount: number;
};

/**
 * Auto path only: approve vs needs_review. Rejected is reserved for explicit moderator action.
 */
export function evaluateExpiredPendingSubmission(signals: EngagementSignals): AutoEvaluationOutcome {
  const r = MODERATION_RULES.autoApproveAfterExpiry;
  if (signals.reportCount > r.maxReports) return "needs_review";
  const total = signals.upvotes + signals.downvotes;
  if (total < r.minTotalVotes) return "needs_review";
  if (signals.upvotes < r.minUpvotes) return "needs_review";
  const ratio = total > 0 ? signals.upvotes / total : 0;
  if (ratio < r.minUpvoteRatio) return "needs_review";
  return "approved";
}
