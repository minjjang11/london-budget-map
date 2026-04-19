/** Row from public.place_review_tags (migration 015). */
export type PlaceReviewTagRow = {
  id: string;
  place_id: string;
  user_id: string;
  tag_key: string;
  created_at: string;
};

export type PlaceReviewTagInsert = {
  place_id: string;
  user_id: string;
  tag_key: string;
};
