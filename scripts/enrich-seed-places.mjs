import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import xlsx from "xlsx";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "supabase", "imports");
const IMPORT_CSV_PATH = path.join(OUTPUT_DIR, "places_seed_import.csv");
const REVIEW_CSV_PATH = path.join(OUTPUT_DIR, "places_seed_manual_review.csv");

const AREA_ALIASES = {
  "쇼디치": "Shoreditch",
  "shoreditch": "Shoreditch",
  "버로우": "Borough",
  "borough": "Borough",
};

const CATEGORY_ALIASES = {
  restaurant: "restaurant",
  beer: "pub",
  pub: "pub",
  cafe: "cafe",
  coffee: "cafe",
};

const AREA_BIAS = {
  Shoreditch: { lat: 51.5246, lng: -0.0786 },
  Borough: { lat: 51.5007, lng: -0.0912 },
};

const PLACE_COLUMNS = [
  "status",
  "name",
  "category",
  "area",
  "address",
  "lat",
  "lng",
  "lowest_price_gbp",
  "submissions",
  "registered_at",
  "upvotes",
  "comments",
  "description",
  "google_place_id",
  "downvotes",
];

function text(value) {
  if (value == null) return "";
  return String(value).trim();
}

function isBlank(value) {
  return text(value) === "";
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

function normalizeArea(value) {
  const raw = normalizeLoose(value);
  return AREA_ALIASES[raw] ?? normalizeSpaces(value);
}

function normalizeCategory(value) {
  const raw = normalizeLoose(value);
  return CATEGORY_ALIASES[raw] ?? null;
}

function parsePrice(value) {
  const raw = text(value).replace(/[£,\s]/g, "");
  if (!raw) return null;
  const num = Number.parseFloat(raw);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : null;
}

function formatMoney(value) {
  if (value == null || !Number.isFinite(value)) return "";
  return `£${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;
}

function extractPostcode(address) {
  const match = text(address).match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  return match ? match[0].toUpperCase().replace(/\s+/, " ") : "";
}

function simplifiedAddress(address) {
  return normalizeLoose(address)
    .replace(/\blondon\b/g, "")
    .replace(/\buk\b/g, "")
    .trim();
}

function csvEscape(value) {
  if (value == null) return "";
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, "\"\"")}"` : stringValue;
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

function inspectWorkbook(filePath) {
  const wb = xlsx.readFile(filePath);
  console.log("Sheets:", wb.SheetNames.join(", "));
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
    console.log(`\n=== ${sheetName} (${rows.length} rows) ===`);
    rows.slice(0, 80).forEach((row, index) => {
      console.log(`${index + 1}: ${JSON.stringify(row)}`);
    });
  }
}

function parseSeedCandidates(filePath) {
  const wb = xlsx.readFile(filePath);
  const seeds = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
    let currentArea = "";
    let currentCategory = null;
    let lastSeed = null;

    rows.forEach((row, index) => {
      const first = text(row[0]);
      const second = text(row[1]);
      const third = text(row[2]);
      const fourth = text(row[3]);
      const blankRow = [first, second, third, fourth].every((value) => !value);
      if (blankRow) {
        lastSeed = null;
        return;
      }

      const maybeArea = normalizeArea(first);
      if (first && !second && !third && !fourth && AREA_ALIASES[normalizeLoose(first)]) {
        currentArea = maybeArea;
        currentCategory = null;
        lastSeed = null;
        return;
      }

      const maybeCategory = normalizeCategory(first);
      if (maybeCategory && !second && !third && !fourth) {
        currentCategory = maybeCategory;
        lastSeed = null;
        return;
      }

      if (!currentArea || !currentCategory) return;

      const price = parsePrice(third);

      if (first) {
        const seed = {
          source_sheet: sheetName,
          source_rows: [index + 1],
          name: first,
          category: currentCategory,
          area: currentArea,
          address: fourth || "",
          representative_menu: second || "",
          lowest_price_gbp: price,
          menus: second || price != null ? [{ menu: second || "", price_gbp: price }] : [],
        };
        seeds.push(seed);
        lastSeed = seed;
        return;
      }

      if (lastSeed && (second || third || fourth)) {
        lastSeed.source_rows.push(index + 1);
        if (!lastSeed.representative_menu && second) lastSeed.representative_menu = second;
        if (!lastSeed.address && fourth) lastSeed.address = fourth;
        if (price != null) {
          lastSeed.lowest_price_gbp =
            lastSeed.lowest_price_gbp == null ? price : Math.min(lastSeed.lowest_price_gbp, price);
        }
        if (second || price != null) {
          lastSeed.menus.push({ menu: second || "", price_gbp: price });
        }
      }
    });
  }

  return seeds;
}

function buildDescription(seed) {
  const categoryLabel =
    seed.category === "restaurant" ? "cheap eat" : seed.category === "pub" ? "budget pint" : "budget coffee";
  const menu = seed.representative_menu ? seed.representative_menu.toLowerCase() : categoryLabel;
  const price = seed.lowest_price_gbp != null ? ` for ${formatMoney(seed.lowest_price_gbp)}` : "";
  return `${seed.area} ${categoryLabel} pick: ${menu}${price}.`;
}

function buildQuery(seed) {
  return [seed.name, seed.address, seed.area, "London"].filter(Boolean).join(", ");
}

function scoreCandidate(seed, candidate) {
  const seedName = normalizeLoose(seed.name);
  const candidateName = normalizeLoose(candidate.name);
  const candidateAddress = normalizeLoose(candidate.formatted_address);
  const seedAddress = normalizeLoose(seed.address);
  let score = 0;
  const reasons = [];

  if (seedName && candidateName === seedName) {
    score += 0.58;
    reasons.push("exact-name");
  } else if (seedName && (candidateName.includes(seedName) || seedName.includes(candidateName))) {
    score += 0.34;
    reasons.push("partial-name");
  }

  if (seed.address) {
    const postcode = extractPostcode(seed.address);
    if (postcode && candidate.formatted_address.toUpperCase().includes(postcode)) {
      score += 0.28;
      reasons.push("postcode");
    }
    const simpleSeedAddress = simplifiedAddress(seed.address);
    if (simpleSeedAddress && candidateAddress.includes(simpleSeedAddress.slice(0, 10))) {
      score += 0.14;
      reasons.push("address-fragment");
    }
  }

  if (seed.area && candidateAddress.includes(seed.area.toLowerCase())) {
    score += 0.12;
    reasons.push("area");
  }

  if (!seed.address && reasons.includes("exact-name")) {
    score += 0.08;
    reasons.push("name-only-boost");
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

async function lookupPlace(seed, apiKey) {
  const query = buildQuery(seed);
  const bias = AREA_BIAS[seed.area];
  const findParams = new URLSearchParams({
    input: query,
    inputtype: "textquery",
    fields: "place_id,name,formatted_address,geometry",
    key: apiKey,
  });
  if (bias) {
    findParams.set("locationbias", `circle:3500@${bias.lat},${bias.lng}`);
  }

  const candidates = [];

  try {
    const findRes = await fetchJson(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`,
    );
    for (const candidate of findRes.candidates ?? []) {
      candidates.push(candidate);
    }
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

  if (candidates.length === 0) {
    return { accepted: false, query, reason: "no-google-match" };
  }

  const scored = candidates
    .map((candidate) => ({
      candidate,
      ...scoreCandidate(seed, candidate),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const lat = best?.candidate?.geometry?.location?.lat;
  const lng = best?.candidate?.geometry?.location?.lng;
  const accepted = Boolean(best && best.score >= 0.7 && Number.isFinite(lat) && Number.isFinite(lng));

  return {
    accepted,
    query,
    score: best?.score ?? 0,
    reasons: best?.reasons ?? [],
    candidate: best?.candidate ?? null,
    reason: accepted ? "" : `low-confidence:${best?.score?.toFixed(2) ?? "0.00"}`,
  };
}

function toImportRow(seed, match, registeredAt) {
  return {
    status: "approved",
    name: seed.name,
    category: seed.category,
    area: seed.area,
    address: match.candidate.formatted_address || seed.address || "",
    lat: match.candidate.geometry.location.lat,
    lng: match.candidate.geometry.location.lng,
    lowest_price_gbp: seed.lowest_price_gbp ?? "",
    submissions: "[]",
    registered_at: registeredAt,
    upvotes: 0,
    comments: "[]",
    description: buildDescription(seed),
    google_place_id: match.candidate.place_id || "",
    downvotes: 0,
  };
}

function toReviewRow(seed, match, reasonOverride = "") {
  return {
    source_sheet: seed.source_sheet,
    source_rows: seed.source_rows.join("|"),
    name: seed.name,
    category: seed.category,
    area: seed.area,
    address: seed.address || "",
    representative_menu: seed.representative_menu || "",
    lowest_price_gbp: seed.lowest_price_gbp ?? "",
    google_query: match?.query || buildQuery(seed),
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

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/enrich-seed-places.mjs <xlsx-path> [--inspect]");
    process.exit(1);
  }

  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Input file not found: ${resolved}`);
    process.exit(1);
  }

  if (process.argv.includes("--inspect")) {
    inspectWorkbook(resolved);
    return;
  }

  const seeds = parseSeedCandidates(resolved);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const env = loadConfigEnv();
  const apiKey = env.GOOGLE_MAPS_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const registeredAt = new Date().toISOString();

  const importRows = [];
  const reviewRows = [];

  if (!apiKey) {
    for (const seed of seeds) {
      reviewRows.push(toReviewRow(seed, null, "missing-google-maps-api-key"));
    }
    writeCsv(IMPORT_CSV_PATH, PLACE_COLUMNS, []);
    writeCsv(REVIEW_CSV_PATH, Object.keys(reviewRows[0] ?? { name: "" }), reviewRows);
    console.log(`Parsed ${seeds.length} rows.`);
    console.log("Google Places API key missing. Wrote manual review file only.");
    console.log(`Import CSV: ${IMPORT_CSV_PATH}`);
    console.log(`Manual review CSV: ${REVIEW_CSV_PATH}`);
    return;
  }

  for (const seed of seeds) {
    const match = await lookupPlace(seed, apiKey);
    if (match.accepted) {
      importRows.push(toImportRow(seed, match, registeredAt));
    } else {
      reviewRows.push(toReviewRow(seed, match));
    }
  }

  writeCsv(IMPORT_CSV_PATH, PLACE_COLUMNS, importRows);
  writeCsv(REVIEW_CSV_PATH, Object.keys(reviewRows[0] ?? { name: "" }), reviewRows);

  console.log(`Parsed rows: ${seeds.length}`);
  console.log(`Enriched successfully: ${importRows.length}`);
  console.log(`Need manual review: ${reviewRows.length}`);
  console.log(`Import CSV: ${IMPORT_CSV_PATH}`);
  console.log(`Manual review CSV: ${REVIEW_CSV_PATH}`);
}

await main();
