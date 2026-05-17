import type { SupabaseClient } from "@supabase/supabase-js";
import type { Spot, Category } from "@/lib/types/spot";
import type { Database } from "@/lib/types/database";
import { insertSavedPlace } from "@/lib/places/savedPlaces";

const LS_LOCAL_SAVED_V3 = "budget-map-local-saved-v3";
const LS_SAVED_LEGACY = "budget-map-saved-v2";

export type LocalSavedPlaceRecord = {
  id: string;
  name: string;
  category: Category;
  area: string;
  lat: number;
  lng: number;
  address: string;
  lowestPriceGbp: number;
  photo?: string;
  savedAt: string;
};

export type LocalSavedPlaceMap = Record<string, LocalSavedPlaceRecord>;

export type SyncLocalSavedPlacesResult = {
  syncedIds: string[];
  failedIds: string[];
  errors: string[];
};

function lowestPriceFromSpot(spot: Spot): number {
  let min = Infinity;
  spot.submissions.forEach((s) => s.items.forEach((i) => {
    if (i.price < min) min = i.price;
  }));
  return min === Infinity ? 0 : min;
}

export function spotToLocalSavedRecord(spot: Spot): LocalSavedPlaceRecord {
  const photo = spot.submissions[0]?.photo?.trim();
  return {
    id: spot.id,
    name: spot.name,
    category: spot.category,
    area: spot.area,
    lat: spot.lat,
    lng: spot.lng,
    address: spot.address,
    lowestPriceGbp: lowestPriceFromSpot(spot),
    ...(photo ? { photo } : {}),
    savedAt: new Date().toISOString(),
  };
}

export function localSavedRecordToSpot(record: LocalSavedPlaceRecord): Spot {
  const price = record.lowestPriceGbp > 0 ? record.lowestPriceGbp : 0;
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    area: record.area,
    lat: record.lat,
    lng: record.lng,
    address: record.address,
    submissions: [
      {
        id: `local_${record.id}`,
        items: price > 0 ? [{ name: "Saved", price }] : [{ name: "Saved", price: 0 }],
        photo: record.photo,
        date: record.savedAt,
      },
    ],
  };
}

function parseV3(raw: string): LocalSavedPlaceMap {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return {};
  const map: LocalSavedPlaceMap = {};
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Partial<LocalSavedPlaceRecord>;
    if (typeof r.id !== "string" || !r.id) continue;
    if (typeof r.name !== "string" || typeof r.category !== "string") continue;
    if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
    map[r.id] = {
      id: r.id,
      name: r.name,
      category: r.category as Category,
      area: typeof r.area === "string" ? r.area : "",
      lat: r.lat,
      lng: r.lng,
      address: typeof r.address === "string" ? r.address : "",
      lowestPriceGbp: typeof r.lowestPriceGbp === "number" ? r.lowestPriceGbp : 0,
      ...(typeof r.photo === "string" && r.photo ? { photo: r.photo } : {}),
      savedAt: typeof r.savedAt === "string" ? r.savedAt : new Date().toISOString(),
    };
  }
  return map;
}

function loadLegacyIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SAVED_LEGACY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

/** Loads device bookmarks; merges legacy id-only key into v3 when present. */
export function loadLocalSavedPlaces(): LocalSavedPlaceMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_LOCAL_SAVED_V3);
    const map = raw ? parseV3(raw) : {};
    const legacyIds = loadLegacyIds();
    for (const id of legacyIds) {
      if (!map[id]) {
        map[id] = {
          id,
          name: "Saved place",
          category: "restaurant",
          area: "",
          lat: 0,
          lng: 0,
          address: "",
          lowestPriceGbp: 0,
          savedAt: new Date().toISOString(),
        };
      }
    }
    if (legacyIds.length > 0) {
      persistLocalSavedPlaces(map);
      try {
        localStorage.removeItem(LS_SAVED_LEGACY);
      } catch {
        /* ignore */
      }
    }
    return map;
  } catch {
    return {};
  }
}

export function persistLocalSavedPlaces(map: LocalSavedPlaceMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_LOCAL_SAVED_V3, JSON.stringify(Object.values(map)));
  } catch {
    /* ignore quota */
  }
}

export function isUniqueViolation(message: string): boolean {
  return /duplicate|unique|23505/i.test(message);
}

/**
 * Uploads local bookmarks for approved places. Keeps local rows on failure.
 * Removes local rows only for ids confirmed in Supabase after successful insert.
 */
export async function syncLocalSavedPlacesToAccount(
  client: SupabaseClient<Database>,
  userId: string,
  localSaved: LocalSavedPlaceMap,
  remoteIds: Set<string>,
  approvedPlaceIds: Set<string>,
): Promise<SyncLocalSavedPlacesResult> {
  const syncedIds: string[] = [];
  const failedIds: string[] = [];
  const errors: string[] = [];

  for (const record of Object.values(localSaved)) {
    if (!approvedPlaceIds.has(record.id)) continue;
    if (remoteIds.has(record.id)) {
      syncedIds.push(record.id);
      continue;
    }

    const { error } = await insertSavedPlace(client, record.id, userId);
    if (!error || isUniqueViolation(error)) {
      syncedIds.push(record.id);
      continue;
    }
    failedIds.push(record.id);
    if (!errors.includes(error)) errors.push(error);
  }

  return { syncedIds, failedIds, errors };
}

export function localSavedMapWithoutIds(
  map: LocalSavedPlaceMap,
  idsToRemove: Iterable<string>,
): LocalSavedPlaceMap {
  const remove = new Set(idsToRemove);
  const next: LocalSavedPlaceMap = {};
  for (const [id, record] of Object.entries(map)) {
    if (!remove.has(id)) next[id] = record;
  }
  return next;
}
