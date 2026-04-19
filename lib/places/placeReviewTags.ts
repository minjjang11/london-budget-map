/**
 * Fixed vocabulary for approved-place review tags (v1 in code — DB CHECK mirrors these slugs).
 * Display labels are human-readable; `slug` is stored in `place_review_tags.tag_key`.
 */

export const PLACE_REVIEW_TAG_SLUGS = [
  "cheap",
  "fair",
  "pricey",
  "worth_it",
  "bargain",
  "filling",
  "light",
  "huge",
  "small",
  "tasty",
  "bland",
  "salty",
  "sweet",
  "spicy",
  "greasy",
  "hot",
  "cold",
  "fresh",
  "soggy",
  "fizzy",
  "flat",
  "friendly",
  "rude",
  "quick",
  "slow",
  "clean",
  "dirty",
  "cozy",
  "loud",
  "crowded",
  "quiet",
  "takeaway",
  "dine_in",
  "student_friendly",
  "late_night",
  "good",
  "very_good",
  "bad",
  "very_bad",
  "overrated",
  "underrated",
  "hits",
  "slaps",
  "missed",
  "waited",
  "packed",
  "sold_out",
  "gone",
] as const;

export type PlaceReviewTagSlug = (typeof PLACE_REVIEW_TAG_SLUGS)[number];

const SLUG_SET = new Set<string>(PLACE_REVIEW_TAG_SLUGS);

/** Human-readable label for UI and map. */
export const PLACE_REVIEW_TAG_LABELS: Record<PlaceReviewTagSlug, string> = {
  cheap: "cheap",
  fair: "fair",
  pricey: "pricey",
  worth_it: "worth it",
  bargain: "bargain",
  filling: "filling",
  light: "light",
  huge: "huge",
  small: "small",
  tasty: "tasty",
  bland: "bland",
  salty: "salty",
  sweet: "sweet",
  spicy: "spicy",
  greasy: "greasy",
  hot: "hot",
  cold: "cold",
  fresh: "fresh",
  soggy: "soggy",
  fizzy: "fizzy",
  flat: "flat",
  friendly: "friendly",
  rude: "rude",
  quick: "quick",
  slow: "slow",
  clean: "clean",
  dirty: "dirty",
  cozy: "cozy",
  loud: "loud",
  crowded: "crowded",
  quiet: "quiet",
  takeaway: "takeaway",
  dine_in: "dine-in",
  student_friendly: "student-friendly",
  late_night: "late-night",
  good: "good",
  very_good: "very good",
  bad: "bad",
  very_bad: "very bad",
  overrated: "overrated",
  underrated: "underrated",
  hits: "hits",
  slaps: "slaps",
  missed: "missed",
  waited: "waited",
  packed: "packed",
  sold_out: "sold-out",
  gone: "gone",
};

export const MAX_PLACE_REVIEW_TAGS_PER_USER = 3;

export function isAllowedPlaceReviewSlug(key: string): key is PlaceReviewTagSlug {
  return SLUG_SET.has(key);
}

/** Dedupe, filter to allowed, cap at max (caller may toast if truncated). */
export function sanitizePlaceReviewTagSlugs(raw: string[]): PlaceReviewTagSlug[] {
  const out: PlaceReviewTagSlug[] = [];
  const seen = new Set<string>();
  for (const k of raw) {
    const t = k.trim();
    if (!t || seen.has(t)) continue;
    if (!isAllowedPlaceReviewSlug(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_PLACE_REVIEW_TAGS_PER_USER) break;
  }
  return out;
}

export function labelForPlaceReviewSlug(slug: string): string {
  if (isAllowedPlaceReviewSlug(slug)) return PLACE_REVIEW_TAG_LABELS[slug];
  return slug;
}
