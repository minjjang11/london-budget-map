/** Client-side spot model (local + approved remote). */

export type Category = "pub" | "restaurant" | "cafe";

export type SpotMenuItem = { name: string; price: number };

export type SpotSubmissionRecord = {
  id: string;
  items: SpotMenuItem[];
  review?: string;
  photo?: string;
  date: string;
};

export type SpotComment = {
  id: string;
  text: string;
  date: string;
};

export type Spot = {
  id: string;
  name: string;
  category: Category;
  area: string;
  lat: number;
  lng: number;
  address: string;
  /** Optional short blurb (e.g. from Supabase `places.description`). */
  description?: string;
  submissions: SpotSubmissionRecord[];
  /** When the spot was first registered (ISO) — used for 7-day community review window. */
  registeredAt?: string;
  upvotes?: number;
  /** Cumulative downvotes on approved `places` rows (rankings / future map voting). */
  downvotes?: number;
  comments?: SpotComment[];
  /** True for approved seed/import rows synthesized from `places` without submission history. */
  isImportedSeed?: boolean;
};
