/**
 * Central moderation thresholds — do not duplicate these in UI.
 * Used by server-side evaluation (expired pending) and available for tests / admin tooling.
 */

export type SubmissionModerationBucket = "approved" | "needs_review" | "rejected";

/** Outcome of automatic evaluation when the community review window has ended. */
export type AutoEvaluationOutcome = "approved" | "rejected" | "needs_review";

export const MODERATION_RULES = {
  /** After `review_ends_at`, still-`pending` rows are evaluated from community votes. */
  autoApproveAfterExpiry: {
    /** If there are this many distinct reports, send to human review instead of auto-reject/approve. */
    minReportsForHumanReview: 3,
  },
} as const;

export type EngagementSignals = {
  upvotes: number;
  downvotes: number;
  reportCount: number;
};

/**
 * When `review_ends_at` passes: no votes → rejected; downvotes &gt; upvotes → rejected;
 * tie or more upvotes than downvotes → approved; heavy reports → needs_review.
 */
export function evaluateExpiredPendingSubmission(signals: EngagementSignals): AutoEvaluationOutcome {
  const { minReportsForHumanReview } = MODERATION_RULES.autoApproveAfterExpiry;
  if (signals.reportCount >= minReportsForHumanReview) return "needs_review";
  const { upvotes, downvotes } = signals;
  if (upvotes + downvotes === 0) return "rejected";
  if (downvotes > upvotes) return "rejected";
  return "approved";
}
