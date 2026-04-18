/**
 * Supabase row shapes. Phase 1: types only. Phase 2: `places` table read path.
 * Pending user submissions (review queue) will use `place_submissions` later — schema stub below.
 */

import type { Category } from "./spot";

/** Row from public.places (see supabase/migrations). */
export type PlaceRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  name: string;
  category: Category;
  area: string;
  address: string | null;
  lat: number;
  lng: number;
  /** Lowest menu price in GBP for map pill when submissions JSON is empty. */
  lowest_price_gbp: number | null;
  /** Mirrors app `SpotSubmissionRecord[]` when detailed menu rows exist. */
  submissions: unknown;
  registered_at: string | null;
  upvotes: number | null;
  comments: unknown;
  created_at?: string;
  updated_at?: string;
};

/** Future: user-submitted rows awaiting moderation (not implemented in UI yet). */
export type PlaceSubmissionRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  payload: Record<string, unknown>;
  source_user_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};
