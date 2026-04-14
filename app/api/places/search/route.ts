import { NextRequest, NextResponse } from "next/server";

const LONDON_CENTER = "51.5074,-0.1278";
const RADIUS_M = 22000;

const BOROUGH_HINTS = [
  "Westminster",
  "Camden",
  "Southwark",
  "Tower Hamlets",
  "Hackney",
  "Islington",
  "Lambeth",
  "Kensington and Chelsea",
  "Hammersmith and Fulham",
  "Wandsworth",
  "Greenwich",
  "Lewisham",
  "City of London",
  "Richmond upon Thames",
  "Waltham Forest",
  "Brent",
  "Ealing",
  "Haringey",
  "Newham",
  "Croydon",
  "Bromley",
  "Barnet",
  "Enfield",
  "Merton",
  "Kingston upon Thames",
];

function guessBorough(formattedAddress: string): string {
  for (const b of BOROUGH_HINTS) {
    if (formattedAddress.includes(b)) return b;
  }
  return "London";
}

type GooglePlace = {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: { location: { lat: number; lng: number } };
};

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({
      results: [] as unknown[],
      nextPageToken: null as string | null,
      error: "missing_key" as const,
    });
  }

  const pageToken = req.nextUrl.searchParams.get("pageToken")?.trim();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  let url: URL;
  if (pageToken) {
    await new Promise((r) => setTimeout(r, 2100));
    url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("pagetoken", pageToken);
    url.searchParams.set("key", key);
  } else {
    if (q.length < 2) {
      return NextResponse.json({
        results: [],
        nextPageToken: null,
        error: "short_query" as const,
      });
    }
    const query = `${q} restaurant cafe pub bar London UK`;
    url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", query);
    url.searchParams.set("region", "uk");
    url.searchParams.set("location", LONDON_CENTER);
    url.searchParams.set("radius", String(RADIUS_M));
    url.searchParams.set("key", key);
  }

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    const data = (await res.json()) as {
      status: string;
      results?: GooglePlace[];
      next_page_token?: string;
      error_message?: string;
    };

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({
        results: [],
        nextPageToken: null,
        error: "api_error",
        message: data.error_message ?? data.status,
      });
    }

    const raw = data.results ?? [];
    const results = raw
      .filter((p) => p.geometry?.location)
      .map((p) => {
        const formatted = p.formatted_address ?? p.vicinity ?? "";
        return {
          name: p.name,
          address: formatted,
          lat: p.geometry!.location.lat,
          lng: p.geometry!.location.lng,
          placeId: p.place_id,
          region: guessBorough(formatted),
        };
      });

    return NextResponse.json({
      results,
      nextPageToken: data.next_page_token ?? null,
      error: null as null,
    });
  } catch (e) {
    return NextResponse.json({
      results: [],
      nextPageToken: null,
      error: "fetch_failed",
      message: String(e),
    });
  }
}
