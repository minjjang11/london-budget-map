/** London Budget Map — seed data, boroughs, GBP */

export type Category = "pub" | "restaurant" | "cafe";

export type MenuItem = { name: string; price: number };

export type Submission = {
  id: string;
  items: MenuItem[];
  photo?: string;
  review?: string;
  date: string;
};

export type Spot = {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  /** London borough or "London" for wider area */
  region: string;
  /** When spot was added from Google Places submit flow */
  googlePlaceId?: string;
  submissions: Submission[];
};

/** Borough / area filter chips */
export const LONDON_AREAS = [
  "Westminster",
  "Camden",
  "Southwark",
  "Tower Hamlets",
  "Hackney",
  "Islington",
  "Lambeth",
  "Kensington and Chelsea",
  "City of London",
  "London",
] as const;

export const CATS: { id: Category; emoji: string; label: string; color: string }[] = [
  { id: "pub", emoji: "🍺", label: "Pub", color: "#F59E0B" },
  { id: "restaurant", emoji: "🍽️", label: "Restaurant", color: "#F43F5E" },
  { id: "cafe", emoji: "☕", label: "Cafe", color: "#A78BFA" },
];

export const PRICE_CAPS: Record<Category, number> = {
  pub: 8,
  restaurant: 15,
  cafe: 6,
};

export const WORD_POOL = [
  "good", "bad", "amazing", "terrible", "perfect", "decent",
  "hot", "cold", "warm", "fresh", "stale", "crispy",
  "soggy", "fizzy", "flat", "spicy", "sweet", "bitter",
  "salty", "bland", "fast", "slow", "friendly", "rude",
  "loud", "quiet", "clean", "cheap", "cosy", "busy",
];

export const FUNC_WORDS = ["the", "is", "was", "very", "not", "and", "but", "a", "it", "my"];

export const LS_KEY = "geojimap-london-spots";

export const LS_SAVED = "geojimap-london-saved";

export function formatGbp(n: number) {
  return `£${n.toFixed(2)}`;
}

/** Google Maps URL for a Place ID (official search URL). */
export function googleMapsPlaceUrl(placeId: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`place_id:${placeId}`)}`;
}

export function googleMapsDirectionsUrl(opts: { placeId?: string; lat: number; lng: number }) {
  if (opts.placeId) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`place_id:${opts.placeId}`)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${opts.lat},${opts.lng}`;
}

export const SEED_SPOTS: Spot[] = [
  {
    id: "ws",
    name: "Wetherspoons",
    category: "pub",
    lat: 51.5033,
    lng: -0.1195,
    address: "Various locations",
    region: "Westminster",
    submissions: [
      {
        id: "s1",
        items: [
          { name: "Pint of Ruddles", price: 2.49 },
          { name: "Doom Bar", price: 3.2 },
        ],
        review: "cheap and decent very good",
        date: "2026-03-15",
      },
    ],
  },
  {
    id: "mono",
    name: "Monmouth Coffee",
    category: "cafe",
    lat: 51.5135,
    lng: -0.0895,
    address: "2 Park St, Borough",
    region: "Southwark",
    submissions: [
      {
        id: "s7",
        items: [
          { name: "Filter Coffee", price: 3.2 },
          { name: "Flat White", price: 3.8 },
        ],
        review: "amazing fresh warm perfect good",
        date: "2026-03-28",
      },
    ],
  },
  {
    id: "dish",
    name: "Dishoom",
    category: "restaurant",
    lat: 51.5244,
    lng: -0.0773,
    address: "7 Boundary St, Shoreditch",
    region: "Hackney",
    submissions: [
      {
        id: "s6",
        items: [
          { name: "Lunch Set", price: 9.5 },
          { name: "Black Daal", price: 7.8 },
        ],
        review: "perfect warm friendly fast amazing",
        date: "2026-02-14",
      },
    ],
  },
  {
    id: "roti",
    name: "Roti King",
    category: "restaurant",
    lat: 51.5281,
    lng: -0.133,
    address: "40 Doric Way, Euston",
    region: "Camden",
    submissions: [
      {
        id: "s5",
        items: [
          { name: "Roti Canai", price: 6.0 },
          { name: "Nasi Lemak", price: 8.0 },
        ],
        review: "amazing hot spicy fresh very good",
        date: "2026-01-22",
      },
    ],
  },
  {
    id: "anchor",
    name: "The Anchor Bankside",
    category: "pub",
    lat: 51.5072,
    lng: -0.0916,
    address: "34 Park St, SE1",
    region: "Southwark",
    submissions: [
      {
        id: "s3",
        items: [
          { name: "IPA Pint", price: 5.2 },
          { name: "Lager Pint", price: 4.8 },
        ],
        review: "warm and friendly very good",
        date: "2026-04-01",
      },
    ],
  },
  {
    id: "dept",
    name: "Dept. of Coffee",
    category: "cafe",
    lat: 51.5256,
    lng: -0.0764,
    address: "14-16 Leather Ln",
    region: "Camden",
    submissions: [
      {
        id: "s8",
        items: [
          { name: "Espresso", price: 2.8 },
          { name: "Oat Latte", price: 3.6 },
        ],
        review: "good warm quiet clean",
        date: "2026-04-05",
      },
    ],
  },
];
