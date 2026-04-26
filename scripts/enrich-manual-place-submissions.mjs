import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "supabase", "imports");
const SUBMISSIONS_CSV_PATH = path.join(OUTPUT_DIR, "place_submissions_manual_add.csv");
const SUBMISSIONS_SQL_PATH = path.join(OUTPUT_DIR, "place_submissions_manual_add.sql");
const REVIEW_CSV_PATH = path.join(OUTPUT_DIR, "place_submissions_manual_add_review.csv");

const MANUAL_ROWS = [
  { name: "Ngon Ngon", area: "Soho", address_hint: "", menu_item_name: "Pho", price_gbp: 11.5, description: "Vietnamese mains usually under twelve pounds." },
  { name: "Mr Wu", area: "Soho", address_hint: "28 Wardour Street, W1D 6QN", menu_item_name: "Roast duck rice", price_gbp: 9.5, description: "Quick Chinese rice plates at student-friendly prices." },
  { name: "3 Mien", area: "Shoreditch", address_hint: "Middlesex Street, E1 7EZ", menu_item_name: "Bun bo hue", price_gbp: 11.0, description: "Casual noodle soups with straightforward portions." },
  { name: "My Old Place", area: "Shoreditch", address_hint: "Middlesex Street, E1 7EZ", menu_item_name: "Hand-pulled noodles", price_gbp: 10.5, description: "Simple Chinese comfort dishes and noodle bowls." },
  { name: "Wok The Pho", area: "Borough", address_hint: "", menu_item_name: "Beef pho", price_gbp: 11.5, description: "Solid pho and wok dishes with low-key pricing." },
  { name: "Marie's Cafe", area: "Borough", address_hint: "90 Lower Marsh, SE1 7AB", menu_item_name: "Full English", price_gbp: 9.5, description: "Classic cafe plates with predictable value." },
  { name: "Bento Bab", area: "Soho", address_hint: "", menu_item_name: "Bibimbap", price_gbp: 9.9, description: "Korean rice bowls and bento style mains." },
  { name: "On The Bab", area: "Shoreditch", address_hint: "Old Street, EC1V 9LA", menu_item_name: "Chicken rice bowl", price_gbp: 11.9, description: "Fast Korean bowls and fried options under budget." },
  { name: "Dan Dan", area: "Borough", address_hint: "34-36 Southwark Street, SE1 1TU", menu_item_name: "Dan dan noodles", price_gbp: 11.5, description: "Noodle-focused menu with reliable mid-range portions." },
  { name: "KoKoDoo", area: "Shoreditch", address_hint: "54 Paul Street, EC2A 4LN", menu_item_name: "Korean chicken over rice", price_gbp: 10.9, description: "Korean comfort meals that usually stay affordable." },
];

const AREA_BIAS = {
  Soho: { lat: 51.5136, lng: -0.1365 },
  Shoreditch: { lat: 51.5246, lng: -0.0786 },
  Borough: { lat: 51.5007, lng: -0.0912 },
};

const CSV_COLUMNS = [
  "status",
  "submitted_at",
  "review_ends_at",
  "submitted_by",
  "place_name",
  "address",
  "lat",
  "lng",
  "category",
  "menu_item_name",
  "price_gbp",
  "description",
  "photo",
  "area",
  "google_place_id",
];

function text(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeSpaces(value) {
  return text(value).replace(/\s+/g, " ").trim();
}

function normalizeLoose(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPostcode(address) {
  const match = text(address).match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  return match ? match[0].toUpperCase().replace(/\s+/, " ") : "";
}

function csvEscape(value) {
  if (value == null) return "";
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, "\"\"")}"` : stringValue;
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function writeCsv(filePath, columns, rows) {
  const body = [
    columns.map(csvEscape).join(","),
    ...rows.map((row) => columns.map((col) => csvEscape(row[col] ?? "")).join(",")),
  ].join("\n");
  fs.writeFileSync(filePath, `${body}\n`, "utf8");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    out[key] = value;
  }
  return out;
}

function loadConfigEnv() {
  return {
    ...loadEnvFile(path.join(ROOT, ".env")),
    ...loadEnvFile(path.join(ROOT, ".env.local")),
    ...process.env,
  };
}

function buildQuery(row) {
  return [row.name, row.address_hint, row.area, "London"].filter(Boolean).join(", ");
}

function scoreCandidate(row, candidate) {
  const rowName = normalizeLoose(row.name);
  const candidateName = normalizeLoose(candidate.name);
  const candidateAddress = normalizeLoose(candidate.formatted_address);

  let score = 0;
  const reasons = [];

  if (rowName && candidateName === rowName) {
    score += 0.66;
    reasons.push("exact-name");
  } else if (rowName && (candidateName.includes(rowName) || rowName.includes(candidateName))) {
    score += 0.36;
    reasons.push("partial-name");
  }

  if (row.area && candidateAddress.includes(row.area.toLowerCase())) {
    score += 0.2;
    reasons.push("area");
  }

  const hintPostcode = extractPostcode(row.address_hint || "");
  if (hintPostcode && candidate.formatted_address.toUpperCase().includes(hintPostcode)) {
    score += 0.26;
    reasons.push("postcode");
  }

  if (candidateAddress.includes("london")) {
    score += 0.08;
    reasons.push("london");
  }

  return { score: Math.min(score, 0.99), reasons };
}

async function fetchJson(url) {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function lookupPlace(row, apiKey) {
  const query = buildQuery(row);
  const bias = AREA_BIAS[row.area];
  const findParams = new URLSearchParams({
    input: query,
    inputtype: "textquery",
    fields: "place_id,name,formatted_address,geometry",
    key: apiKey,
  });
  if (bias) findParams.set("locationbias", `circle:3500@${bias.lat},${bias.lng}`);

  const candidates = [];
  try {
    const findRes = await fetchJson(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`,
    );
    for (const candidate of findRes.candidates ?? []) candidates.push(candidate);
  } catch (error) {
    return {
      accepted: false,
      query,
      reason: `places-api-error:${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (candidates.length === 0) {
    const textParams = new URLSearchParams({ query, key: apiKey });
    if (bias) {
      textParams.set("location", `${bias.lat},${bias.lng}`);
      textParams.set("radius", "3500");
    }
    try {
      const textRes = await fetchJson(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${textParams.toString()}`,
      );
      for (const result of textRes.results ?? []) {
        candidates.push({
          place_id: result.place_id,
          name: result.name,
          formatted_address: result.formatted_address,
          geometry: result.geometry,
        });
      }
    } catch (error) {
      return {
        accepted: false,
        query,
        reason: `textsearch-api-error:${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  if (candidates.length === 0) return { accepted: false, query, reason: "no-google-match" };

  const scored = candidates
    .map((candidate) => ({ candidate, ...scoreCandidate(row, candidate) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const lat = best?.candidate?.geometry?.location?.lat;
  const lng = best?.candidate?.geometry?.location?.lng;
  const accepted = Boolean(best && best.score >= 0.72 && Number.isFinite(lat) && Number.isFinite(lng));

  return {
    accepted,
    query,
    score: best?.score ?? 0,
    reasons: best?.reasons ?? [],
    candidate: best?.candidate ?? null,
    reason: accepted ? "" : `low-confidence:${best?.score?.toFixed(2) ?? "0.00"}`,
  };
}

function toSubmissionRow(row, match, submittedAtIso, reviewEndsAtIso) {
  return {
    status: "pending",
    submitted_at: submittedAtIso,
    review_ends_at: reviewEndsAtIso,
    submitted_by: "",
    place_name: row.name,
    address: match.candidate.formatted_address || `${row.area}, London`,
    lat: match.candidate.geometry.location.lat,
    lng: match.candidate.geometry.location.lng,
    category: "restaurant",
    menu_item_name: row.menu_item_name,
    price_gbp: row.price_gbp,
    description: `[manual_add] ${row.description}`,
    photo: "",
    area: row.area,
    google_place_id: match.candidate.place_id || "",
  };
}

function toReviewRow(row, match, reasonOverride = "") {
  return {
    name: row.name,
    area: row.area,
    menu_item_name: row.menu_item_name,
    price_gbp: row.price_gbp,
    google_query: match?.query || buildQuery(row),
    review_reason: reasonOverride || match?.reason || "manual-review",
    match_score: match?.score != null ? match.score.toFixed(2) : "",
    match_reasons: Array.isArray(match?.reasons) ? match.reasons.join("|") : "",
    matched_name: match?.candidate?.name || "",
    matched_address: match?.candidate?.formatted_address || "",
    google_place_id: match?.candidate?.place_id || "",
    lat: match?.candidate?.geometry?.location?.lat ?? "",
    lng: match?.candidate?.geometry?.location?.lng ?? "",
  };
}

function buildSql(rows) {
  if (rows.length === 0) {
    return "-- No accepted rows to insert.\n";
  }

  const values = rows
    .map(
      (row) =>
        `  ('${sqlEscape(row.place_name)}', '${sqlEscape(row.address)}', ${Number(row.lat)}, ${Number(row.lng)}, 'restaurant', '${sqlEscape(row.menu_item_name)}', ${Number(row.price_gbp)}, '${sqlEscape(row.description)}', '${sqlEscape(row.area)}', null, '${sqlEscape(row.google_place_id)}')`,
    )
    .join(",\n");

  return `-- Auto-generated manual_add inserts for place_submissions
-- Dedupe checks are case-insensitive by place name across submissions + approved places.
with seed_rows (
  place_name,
  address,
  lat,
  lng,
  category,
  menu_item_name,
  price_gbp,
  description,
  area,
  photo,
  google_place_id
) as (
values
${values}
)
insert into public.place_submissions (
  status,
  submitted_at,
  review_ends_at,
  submitted_by,
  place_name,
  address,
  lat,
  lng,
  category,
  menu_item_name,
  price_gbp,
  description,
  area,
  photo,
  google_place_id
)
select
  'pending',
  now(),
  now() + interval '7 days',
  null,
  s.place_name,
  s.address,
  s.lat,
  s.lng,
  s.category,
  s.menu_item_name,
  s.price_gbp,
  s.description,
  s.area,
  s.photo,
  s.google_place_id
from seed_rows s
where not exists (
  select 1
  from public.place_submissions ps
  where lower(trim(ps.place_name)) = lower(trim(s.place_name))
)
and not exists (
  select 1
  from public.places p
  where lower(trim(p.name)) = lower(trim(s.place_name))
);
`;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const env = loadConfigEnv();
  const apiKey = env.GOOGLE_MAPS_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const submittedAt = new Date();
  const reviewEndsAt = new Date(submittedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const submittedAtIso = submittedAt.toISOString();
  const reviewEndsAtIso = reviewEndsAt.toISOString();

  const submissionRows = [];
  const reviewRows = [];

  if (!apiKey) {
    for (const row of MANUAL_ROWS) {
      reviewRows.push(toReviewRow(row, null, "missing-google-maps-api-key"));
    }
    writeCsv(SUBMISSIONS_CSV_PATH, CSV_COLUMNS, []);
    writeCsv(REVIEW_CSV_PATH, Object.keys(reviewRows[0] ?? { name: "" }), reviewRows);
    fs.writeFileSync(SUBMISSIONS_SQL_PATH, buildSql([]), "utf8");
    console.log(`API key missing. Parsed rows: ${MANUAL_ROWS.length}`);
    console.log(`Manual review rows: ${reviewRows.length}`);
    console.log(`CSV: ${SUBMISSIONS_CSV_PATH}`);
    console.log(`SQL: ${SUBMISSIONS_SQL_PATH}`);
    console.log(`Review CSV: ${REVIEW_CSV_PATH}`);
    return;
  }

  for (const row of MANUAL_ROWS) {
    const match = await lookupPlace(row, apiKey);
    if (match.accepted) {
      submissionRows.push(toSubmissionRow(row, match, submittedAtIso, reviewEndsAtIso));
    } else {
      reviewRows.push(toReviewRow(row, match));
    }
  }

  writeCsv(SUBMISSIONS_CSV_PATH, CSV_COLUMNS, submissionRows);
  writeCsv(REVIEW_CSV_PATH, Object.keys(reviewRows[0] ?? { name: "" }), reviewRows);
  fs.writeFileSync(SUBMISSIONS_SQL_PATH, buildSql(submissionRows), "utf8");

  console.log(`Parsed rows: ${MANUAL_ROWS.length}`);
  console.log(`Enriched successfully: ${submissionRows.length}`);
  console.log(`Need manual review: ${reviewRows.length}`);
  console.log(`CSV: ${SUBMISSIONS_CSV_PATH}`);
  console.log(`SQL: ${SUBMISSIONS_SQL_PATH}`);
  console.log(`Review CSV: ${REVIEW_CSV_PATH}`);
}

await main();
