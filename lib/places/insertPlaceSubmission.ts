import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { Category } from "../types/spot";

const REVIEW_MS = 7 * 24 * 60 * 60 * 1000;

export type NewPlaceSubmissionInput = {
  place_name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  menu_item_name: string;
  price_gbp: number;
  description: string | null;
  area: string | null;
};

export async function insertPlaceSubmission(
  client: SupabaseClient<Database>,
  input: NewPlaceSubmissionInput,
  submittedByUserId: string,
): Promise<{ error: string | null }> {
  const submittedAt = new Date();
  const reviewEndsAt = new Date(submittedAt.getTime() + REVIEW_MS);

  const { error } = await client.from("place_submissions").insert({
    status: "pending",
    submitted_at: submittedAt.toISOString(),
    review_ends_at: reviewEndsAt.toISOString(),
    submitted_by: submittedByUserId,
    place_name: input.place_name,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    menu_item_name: input.menu_item_name,
    price_gbp: input.price_gbp,
    description: input.description,
    area: input.area,
  });

  if (error) return { error: error.message };
  return { error: null };
}
