/**
 * Central ranking math — adjust weights here instead of scattering magic numbers in UI.
 *
 * Weekly vs all-time: we do not yet persist time-bounded vote events on `places`.
 * - **All-time** uses cumulative `upvotes` / `downvotes` on the row.
 * - **Weekly** reuses the same cumulative scores on the subset of places whose
 *   `registeredAt` falls in the trailing window (new on the map this week).
 */

export const RANKING_RULES = {
  /** Trailing days for the “Weekly” pool (registration / first appearance on map). */
  weeklyRegistrationDays: 7,
  /** Downvotes weigh this much vs one upvote in the net score. */
  downvoteWeight: 1,
} as const;

/** Net social score for ordering (never below 0 for display stability). */
export function rankingNetScore(upvotes: number, downvotes: number): number {
  const u = Number.isFinite(upvotes) ? upvotes : 0;
  const d = Number.isFinite(downvotes) ? downvotes : 0;
  const raw = u - RANKING_RULES.downvoteWeight * d;
  return raw > 0 ? raw : 0;
}

/** All-time and weekly lists use the same score function until per-week vote deltas exist. */
export function rankingWeeklyScore(upvotes: number, downvotes: number): number {
  return rankingNetScore(upvotes, downvotes);
}

export function rankingAllTimeScore(upvotes: number, downvotes: number): number {
  return rankingNetScore(upvotes, downvotes);
}

export function registeredWithinTrailingDays(
  registeredAtIso: string | undefined,
  days: number = RANKING_RULES.weeklyRegistrationDays,
): boolean {
  if (!registeredAtIso) return false;
  const t = new Date(registeredAtIso).getTime();
  if (!Number.isFinite(t)) return false;
  const cutoff = Date.now() - days * 86400000;
  return t >= cutoff;
}
