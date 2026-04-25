/**
 * Supabase row shapes. Phase 1: types only. Phase 2: `places` table read path.
 * Pending user submissions (review queue) will use `place_submissions` later — schema stub below.
 */

import type { Category } from "./spot";

/** Row from public.places (see supabase/migrations). */
export type PlaceRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  submitted_by?: string | null;
  name: string;
  category: Category;
  area: string;
  address: string | null;
  /** Representative menu item name for approved seed / imported places. */
  menu_name?: string | null;
  /** Short public blurb for map preview (column added in 002 migration). */
  description?: string | null;
  /** Google Place ID for dedupe vs submissions (009 migration). */
  google_place_id?: string | null;
  lat: number;
  lng: number;
  /** Lowest menu price in GBP for map pill when submissions JSON is empty. */
  lowest_price_gbp: number | null;
  /** Mirrors app `SpotSubmissionRecord[]` when detailed menu rows exist. */
  submissions: unknown;
  registered_at: string | null;
  upvotes: number | null;
  downvotes?: number | null;
  comments: unknown;
  created_at?: string;
  updated_at?: string;
};

/** Insert payload for `places` (service role / trusted paths). */
export type PlaceInsert = {
  status: "approved";
  submitted_by: string | null;
  name: string;
  category: Category;
  area: string;
  address: string | null;
  menu_name?: string | null;
  lat: number;
  lng: number;
  lowest_price_gbp: number | null;
  description: string | null;
  google_place_id: string | null;
  submissions: unknown;
  registered_at: string | null;
  upvotes: number;
  downvotes: number;
  comments: unknown;
};

/** Row from public.place_submissions (see 003 migration). */
export type PlaceSubmissionRow = {
  id: string;
  status: "pending" | "needs_review" | "approved" | "rejected";
  submitted_at: string;
  review_ends_at: string;
  submitted_by: string | null;
  place_name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  menu_item_name: string;
  price_gbp: number;
  description: string | null;
  photo?: string | null;
  area: string | null;
  google_place_id?: string | null;
};

/** Fields the app sends on insert (DB defaults id; RLS expects pending + submitted_by = auth.uid()). */
export type PlaceSubmissionInsert = {
  status: "pending";
  submitted_at: string;
  review_ends_at: string;
  submitted_by: string;
  place_name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  menu_item_name: string;
  price_gbp: number;
  description: string | null;
  photo?: string | null;
  area: string | null;
  google_place_id?: string | null;
};
