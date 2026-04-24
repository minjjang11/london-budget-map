import type { PlaceRow } from "../types/places";
import type { Spot, SpotComment, SpotMenuItem, SpotSubmissionRecord } from "../types/spot";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseMenuItems(raw: unknown): SpotMenuItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SpotMenuItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? item.name : "";
    const price = typeof item.price === "number" ? item.price : Number(item.price);
    if (!name.trim() || !Number.isFinite(price) || price <= 0) continue;
    out.push({ name: name.trim(), price });
  }
  return out;
}

function parseSubmissions(raw: unknown): SpotSubmissionRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: SpotSubmissionRecord[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    const date = typeof entry.date === "string" ? entry.date : "";
    const review = typeof entry.review === "string" ? entry.review : undefined;
    const items = parseMenuItems(entry.items);
    if (!id || !date || items.length === 0) continue;
    const rec: SpotSubmissionRecord = { id, items, date };
    if (review?.trim()) rec.review = review.trim();
    out.push(rec);
  }
  return out;
}

function parseComments(raw: unknown): SpotComment[] {
  if (!Array.isArray(raw)) return [];
  const out: SpotComment[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    const text = typeof entry.text === "string" ? entry.text : "";
    const date = typeof entry.date === "string" ? entry.date : "";
    if (!id || !text.trim() || !date) continue;
    out.push({ id, text: text.trim(), date });
  }
  return out;
}

function parseMenuNameFromDescription(description: string | null | undefined): string | null {
  if (typeof description !== "string") return null;
  const text = description.trim();
  if (!text) return null;
  const match = text.match(/:\s*(.+?)\s+for\s+£/i);
  return match?.[1]?.trim() || null;
}

function syntheticSubmission(
  lowest: number,
  registeredAt: string | null,
  menuName: string | null | undefined,
  description: string | null | undefined,
): SpotSubmissionRecord[] {
  const date = registeredAt?.includes("T")
    ? registeredAt.split("T")[0]!
    : registeredAt ?? new Date().toISOString().split("T")[0]!;
  const label =
    (typeof menuName === "string" && menuName.trim() ? menuName.trim() : null) ??
    parseMenuNameFromDescription(description) ??
    "Menu (verified)";
  return [
    {
      id: "db_lowest",
      items: [{ name: label, price: lowest }],
      date,
    },
  ];
}

/** Maps an approved `places` row into the app `Spot` model. */
export function mapPlaceRowToSpot(row: PlaceRow): Spot {
  let submissions = parseSubmissions(row.submissions);
  const low = row.lowest_price_gbp;
  const isImportedSeed = submissions.length === 0;
  if (submissions.length === 0 && low != null && Number.isFinite(low) && low > 0) {
    submissions = syntheticSubmission(low, row.registered_at, row.menu_name, row.description);
  }

  const registeredAt = row.registered_at ?? undefined;
  const first = submissions[0];
  const fallbackReg =
    registeredAt ||
    (first?.date?.includes("T") ? first.date : first?.date ? `${first.date}T12:00:00.000Z` : undefined) ||
    new Date().toISOString();

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: row.area,
    lat: row.lat,
    lng: row.lng,
    address: row.address?.trim() || `${row.area}, London`,
    description: row.description?.trim() || undefined,
    submissions,
    registeredAt: fallbackReg,
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
    comments: parseComments(row.comments),
    isImportedSeed,
  };
}
