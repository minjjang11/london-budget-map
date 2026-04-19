/** Row from public.saved_places (see migration 014). */
export type SavedPlaceRow = {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
};

export type SavedPlaceInsert = {
  user_id: string;
  place_id: string;
};
