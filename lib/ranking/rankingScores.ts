/**
 * Central ranking math — adjust weights here instead of scattering magic numbers in UI.
 *
 * Approved-place counts shown in Rankings come from **`place_votes`** aggregates merged in
 * `fetchApprovedPlaces` (not the legacy `places.upvotes` / `places.downvotes` columns).
 * For time-windowed weekly scores, query `place_votes` by `created_at` / `updated_at` (see migration 013).
 *
 * Weekly vs all-time (current UI): we do not yet slice votes by calendar week in SQL.
 * - **All-time** uses merged cumulative up/down from `place_votes`.
 * - **Weekly** reuses the same scores on places whose `registeredAt` is in the trailing window.
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
