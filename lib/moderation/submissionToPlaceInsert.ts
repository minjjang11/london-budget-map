import type { PlaceSubmissionRow } from "../types/places";
import type { PlaceInsert } from "../types/places";

function submissionDateOnly(submittedAt: string): string {
  if (submittedAt.includes("T")) return submittedAt.split("T")[0]!;
  return submittedAt;
}

/** Builds a new approved `places` row from a queue submission (single menu line → submissions JSON). */
export function submissionRowToPlaceInsert(sub: PlaceSubmissionRow): PlaceInsert {
  const date = submissionDateOnly(sub.submitted_at);
  const submissionJson = [
    {
      id: `psub_${sub.id.replace(/-/g, "").slice(0, 12)}`,
      items: [{ name: sub.menu_item_name.trim(), price: Number(sub.price_gbp) }],
      date,
      ...(sub.description?.trim() ? { review: sub.description.trim() } : {}),
    },
  ];

  return {
    status: "approved",
    name: sub.place_name.trim(),
    category: sub.category,
    area: sub.area?.trim() || "London",
    address: sub.address?.trim() || null,
    lat: sub.lat,
    lng: sub.lng,
    lowest_price_gbp: Number(sub.price_gbp),
    description: sub.description?.trim() || null,
    google_place_id: sub.google_place_id?.trim() || null,
    submissions: submissionJson,
    registered_at: sub.submitted_at,
    upvotes: 0,
    comments: [],
  };
}
