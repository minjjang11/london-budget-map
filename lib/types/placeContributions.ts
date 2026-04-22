export type PlaceContributionRow = {
  id: string;
  place_id: string;
  user_id: string;
  menu_item_name: string;
  price_gbp: number;
  comment: string | null;
  photo: string | null;
  created_at: string;
};

export type PlaceContributionInsert = {
  place_id: string;
  user_id: string;
  menu_item_name: string;
  price_gbp: number;
  comment: string | null;
  photo: string | null;
};
