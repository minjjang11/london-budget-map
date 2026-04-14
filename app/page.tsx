"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { MapSpot } from "./components/MapView";
import { Map, MessagesSquare, Plus, Bookmark, Route, X, Navigation } from "lucide-react";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

type Category = "pub" | "restaurant" | "cafe";

type MenuItem = { name: string; price: number };

type Submission = {
  id: string;
  items: MenuItem[];
  review?: string;
  date: string;
};

type Spot = {
  id: string;
  name: string;
  category: Category;
  area: string;
  lat: number;
  lng: number;
  address: string;
  submissions: Submission[];
};

type Tab = "map" | "community" | "submit" | "saved" | "course";

const CATS: { id: Category | "all"; emoji: string; label: string }[] = [
  { id: "all", emoji: "📍", label: "All" },
  { id: "restaurant", emoji: "🍽️", label: "Restaurant" },
  { id: "pub", emoji: "🍺", label: "Beer" },
  { id: "cafe", emoji: "☕", label: "Coffee" },
];

const AREAS = [
  "All", "Soho", "Shoreditch", "Camden", "Brixton",
  "Euston", "Borough", "Bethnal Green", "Hackney",
];

const SEED_SPOTS: Spot[] = [
  {
    id: "ws", name: "Wetherspoons (The Moon Under Water)", category: "pub",
    area: "Soho", lat: 51.5110, lng: -0.1316, address: "28 Leicester Sq, WC2H",
    submissions: [{
      id: "s1", items: [{ name: "Ruddles Best (pint)", price: 2.49 }, { name: "Doom Bar (pint)", price: 3.20 }],
      review: "cheapest pint in central, always busy", date: "2025-03-15",
    }],
  },
  {
    id: "ss", name: "Sam Smith's (The Angel)", category: "pub",
    area: "Borough", lat: 51.5062, lng: -0.0875, address: "101 Bermondsey St, SE1",
    submissions: [{
      id: "s2", items: [{ name: "Old Brewery Bitter (pint)", price: 3.20 }],
      review: "no phones allowed, proper old pub", date: "2025-02-20",
    }],
  },
  {
    id: "anchor", name: "The Anchor Bankside", category: "pub",
    area: "Borough", lat: 51.5072, lng: -0.0916, address: "34 Park St, SE1",
    submissions: [{
      id: "s3", items: [{ name: "IPA (pint)", price: 5.20 }, { name: "Lager (pint)", price: 4.80 }],
      review: "river view, decent prices for the area", date: "2025-04-01",
    }],
  },
  {
    id: "franco", name: "Franco Manca", category: "restaurant",
    area: "Brixton", lat: 51.4613, lng: -0.1156, address: "4 Market Row, Brixton",
    submissions: [{
      id: "s4", items: [{ name: "Margherita", price: 7.50 }, { name: "No.4 (nduja)", price: 9.20 }],
      review: "best cheap pizza in london honestly", date: "2025-03-10",
    }],
  },
  {
    id: "roti", name: "Roti King", category: "restaurant",
    area: "Euston", lat: 51.5281, lng: -0.1330, address: "40 Doric Way, NW1",
    submissions: [{
      id: "s5", items: [{ name: "Roti Canai", price: 2.50 }, { name: "Nasi Lemak", price: 8.00 }],
      review: "massive queue but worth it", date: "2025-01-22",
    }],
  },
  {
    id: "dish", name: "Dishoom", category: "restaurant",
    area: "Shoreditch", lat: 51.5244, lng: -0.0773, address: "7 Boundary St, E2",
    submissions: [{
      id: "s6", items: [{ name: "Pau Bhaji", price: 6.90 }],
      review: "lunch set is good value", date: "2025-02-14",
    }],
  },
  {
    id: "mono", name: "Monmouth Coffee", category: "cafe",
    area: "Borough", lat: 51.5135, lng: -0.0895, address: "2 Park St, SE1",
    submissions: [{
      id: "s7", items: [{ name: "Filter Coffee", price: 3.20 }, { name: "Flat White", price: 3.80 }],
      review: "best coffee in london", date: "2025-03-28",
    }],
  },
  {
    id: "pelli", name: "E Pellicci", category: "cafe",
    area: "Bethnal Green", lat: 51.5274, lng: -0.0609, address: "332 Bethnal Green Rd, E2",
    submissions: [{
      id: "s8", items: [{ name: "Cappuccino", price: 2.50 }],
      review: "proper greasy spoon", date: "2025-03-01",
    }],
  },
  {
    id: "dept", name: "Dept of Coffee", category: "cafe",
    area: "Shoreditch", lat: 51.5215, lng: -0.0764, address: "14 Leather Ln, EC1",
    submissions: [{
      id: "s9", items: [{ name: "Espresso", price: 2.80 }],
      review: "solid coffee", date: "2025-04-05",
    }],
  },
];

const LS_KEY = "budget-map-spots-v1";
const LS_SAVED = "budget-map-saved-v1";

function loadSpots(): Spot[] {
  if (typeof window === "undefined") return SEED_SPOTS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_SPOTS));
      return SEED_SPOTS;
    }
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(SEED_SPOTS));
    return SEED_SPOTS;
  }
}

function saveSpots(spots: Spot[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(spots));
  } catch { /* ignore */ }
}

function loadSaved(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_SAVED);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSavedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_SAVED, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

function lowestPrice(spot: Spot): number {
  let min = Infinity;
  spot.submissions.forEach((s) => s.items.forEach((i) => {
    if (i.price < min) min = i.price;
  }));
  return min === Infinity ? 0 : min;
}

/** Screenshot-style prices: £12, £4.3, £6.5 — 🔥 when under £3 */
function formatMapPriceLabel(lowest: number): string {
  const fire = lowest < 3 ? "🔥 " : "";
  const r = Math.round(lowest * 10) / 10;
  const body = Number.isInteger(r) || Math.abs(r - Math.round(r)) < 0.05
    ? Math.round(r).toString()
    : r.toFixed(1).replace(/\.0$/, "");
  return `${fire}£${body}`;
}

function catEmoji(c: Category) {
  return c === "pub" ? "🍺" : c === "restaurant" ? "🍽️" : "☕";
}

export default function App() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("map");
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const [activeArea, setActiveArea] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const [submitName, setSubmitName] = useState("");
  const [submitArea, setSubmitArea] = useState("Soho");
  const [submitCat, setSubmitCat] = useState<Category>("restaurant");
  const [submitItems, setSubmitItems] = useState<MenuItem[]>([{ name: "", price: 0 }]);
  const [submitReview, setSubmitReview] = useState("");
  const [submitLat, setSubmitLat] = useState("");
  const [submitLng, setSubmitLng] = useState("");
  const [submitDone, setSubmitDone] = useState(false);

  const [courseBudget, setCourseBudget] = useState(25);
  const [courseResult, setCourseResult] = useState<Spot[] | null>(null);

  useEffect(() => {
    setMounted(true);
    setSpots(loadSpots());
    setSavedIds(loadSaved());
  }, []);
  useEffect(() => {
    if (spots.length) saveSpots(spots);
  }, [spots]);
  useEffect(() => {
    saveSavedIds(savedIds);
  }, [savedIds]);

  const filtered = useMemo(
    () =>
      spots.filter((s) => {
        if (activeCat !== "all" && s.category !== activeCat) return false;
        if (activeArea !== "All" && s.area !== activeArea) return false;
        return true;
      }),
    [spots, activeCat, activeArea],
  );

  const ranked = useMemo(
    () => [...filtered].sort((a, b) => lowestPrice(a) - lowestPrice(b)),
    [filtered],
  );

  const mapSpots: MapSpot[] = useMemo(
    () =>
      filtered.map((s) => {
        const low = lowestPrice(s);
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          lat: s.lat,
          lng: s.lng,
          lowestPrice: low,
          priceLabel: formatMapPriceLabel(low),
        };
      }),
    [filtered],
  );

  const selected = spots.find((s) => s.id === selectedId) || null;

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const handleSubmit = () => {
    const validItems = submitItems.filter((i) => i.name && i.price > 0);
    if (!submitName || validItems.length === 0) return;
    const lat = parseFloat(submitLat) || 51.51 + (Math.random() - 0.5) * 0.03;
    const lng = parseFloat(submitLng) || -0.09 + (Math.random() - 0.5) * 0.05;
    const newSpot: Spot = {
      id: `spot_${Date.now()}`,
      name: submitName,
      category: submitCat,
      area: submitArea,
      lat,
      lng,
      address: `${submitArea}, London`,
      submissions: [
        {
          id: `sub_${Date.now()}`,
          items: validItems,
          review: submitReview || undefined,
          date: new Date().toISOString().split("T")[0],
        },
      ],
    };
    setSpots([...spots, newSpot]);
    setSubmitDone(true);
    setTimeout(() => {
      setSubmitDone(false);
      setSubmitName("");
      setSubmitItems([{ name: "", price: 0 }]);
      setSubmitReview("");
      setSubmitLat("");
      setSubmitLng("");
    }, 1600);
  };

  const planCourse = () => {
    const by: Record<Category, Spot[]> = { pub: [], restaurant: [], cafe: [] };
    spots.forEach((s) => by[s.category].push(s));
    let best: Spot[] | null = null;
    let bestTotal = Infinity;
    if (by.pub.length === 0 || by.restaurant.length === 0 || by.cafe.length === 0) {
      setCourseResult([]);
      return;
    }
    for (const pub of by.pub) {
      for (const rest of by.restaurant) {
        for (const cafe of by.cafe) {
          const t = lowestPrice(pub) + lowestPrice(rest) + lowestPrice(cafe);
          if (t <= courseBudget && t < bestTotal) {
            bestTotal = t;
            best = [cafe, rest, pub];
          }
        }
      }
    }
    setCourseResult(best || []);
  };

  const courseTotal =
    courseResult && courseResult.length
      ? courseResult.reduce((s, x) => s + lowestPrice(x), 0)
      : 0;

  const chipCat = (id: Category | "all", label: string, emoji: string) => {
    const active = activeCat === id;
    return (
      <button
        key={String(id)}
        type="button"
        onClick={() => {
          setActiveCat(id);
          setSelectedId(null);
        }}
        className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] transition-colors ${
          active ? "bg-budget-primary font-bold text-white" : "bg-budget-surface font-medium text-budget-text"
        }`}
      >
        <span className={`text-sm ${active ? "" : "opacity-40"}`} aria-hidden>
          {emoji}
        </span>
        {label}
      </button>
    );
  };

  const savedSpots = spots.filter((s) => savedIds.has(s.id));

  return (
    <div className="budget-app relative mx-auto h-svh max-w-[440px] overflow-hidden bg-budget-bg font-sans text-budget-text">
      {/* Full-bleed map layer */}
      {tab === "map" && mounted && (
        <div className="absolute inset-0 z-0">
          <MapView spots={mapSpots} selectedId={selectedId} onSelect={handleSelect} flyTo={flyTo} />
        </div>
      )}

      <header className="absolute left-2.5 right-2.5 top-2.5 z-50 rounded-[20px] border border-budget-surface/90 bg-budget-white px-3.5 pb-3.5 pt-4 shadow-budget-header">
        <h1 className="mb-3 text-[22px] font-extrabold tracking-[-0.04em] text-budget-text">Budget Map</h1>
        <div className="budget-chip-row">{CATS.map((c) => chipCat(c.id as Category | "all", c.label, c.emoji))}</div>
      </header>

      {/* Map overlays — clean full-bleed map per ref */}
      {tab === "map" && (
        <>
          {selected && (
            <div
              role="presentation"
              className="absolute inset-0 z-[45] animate-fade-in bg-budget-text/25"
              onClick={() => setSelectedId(null)}
            >
              <div
                role="dialog"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-3 right-3 max-h-[52%] overflow-y-auto rounded-[22px] border border-budget-surface bg-budget-white p-4 pb-[18px] shadow-budget-sheet animate-slide-up [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-[11px] font-bold text-budget-primary">
                      {catEmoji(selected.category)} {CATS.find((c) => c.id === selected.category)?.label} ·{" "}
                      {selected.area}
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-budget-text">{selected.name}</div>
                    <div className="mt-0.5 text-xs text-budget-text/50">{selected.address}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="grid size-9 shrink-0 place-items-center rounded-full border-0 bg-budget-surface text-budget-text cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="mt-3 inline-block rounded-full bg-budget-surface px-3.5 py-1.5 text-[15px] font-extrabold text-budget-text">
                  from {formatMapPriceLabel(lowestPrice(selected))}
                </div>

                {selected.submissions.map((sub) => (
                  <div key={sub.id} className="mt-3 rounded-[14px] border border-budget-surface bg-budget-bg p-3">
                    <div className="mb-1.5 text-[10px] text-budget-subtle">{sub.date}</div>
                    {sub.items.map((item, ii) => (
                      <div key={ii} className="mb-1 flex justify-between text-sm text-budget-text">
                        <span>{item.name}</span>
                        <span className="font-extrabold">
                          {item.price < 3 ? "🔥 " : ""}£{item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {sub.review && (
                      <div className="mt-2 text-[13px] italic text-budget-muted">&ldquo;{sub.review}&rdquo;</div>
                    )}
                  </div>
                ))}

                <div className="mt-3.5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSave(selected.id)}
                    className={`flex-1 cursor-pointer rounded-[14px] border border-budget-surface py-3 text-[13px] font-bold text-budget-text transition ${
                      savedIds.has(selected.id) ? "bg-budget-surface" : "bg-budget-white"
                    }`}
                  >
                    {savedIds.has(selected.id) ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`,
                        "_blank",
                      );
                    }}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] border-0 bg-budget-primary py-3 text-[13px] font-bold text-white"
                  >
                    <Navigation size={16} />
                    Directions
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "community" && (
        <div className="budget-tab-panel px-3 pb-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-budget-subtle">Area</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {AREAS.map((area) => {
              const active = activeArea === area;
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => setActiveArea(area)}
                  className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs ${
                    active
                      ? "bg-budget-primary font-bold text-white"
                      : "bg-budget-surface font-medium text-budget-text"
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
          <p className="mb-3 text-sm text-budget-muted">Cheapest first — tap to fly there on the map.</p>
          {ranked.map((spot, i) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => {
                setTab("map");
                setSelectedId(spot.id);
                setFlyTo({ center: [spot.lat, spot.lng], zoom: 16 });
              }}
              className="budget-list-btn shadow-[0_2px_8px_rgb(13_31_26_/0.04)]"
            >
              <span className="text-sm font-extrabold text-budget-primary">#{i + 1}</span>
              <span className="text-xl">{catEmoji(spot.category)}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-budget-text">{spot.name}</div>
                <div className="text-xs text-budget-subtle">{spot.area}</div>
              </div>
              <span className="font-extrabold text-budget-primary">{formatMapPriceLabel(lowestPrice(spot))}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "submit" && (
        <div className="budget-tab-panel p-4">
          {submitDone ? (
            <div className="py-12 text-center">
              <div className="mb-2 text-[40px]">✓</div>
              <div className="text-[17px] font-extrabold text-budget-primary">Snitched successfully</div>
              <p className="mt-2 text-sm text-budget-text/50">Legend — that&apos;s going on the map.</p>
            </div>
          ) : (
            <>
              <h2 className="mb-1.5 text-lg font-extrabold text-budget-text">Grass up a cheap eat</h2>
              <p className="mb-4 text-xs text-budget-text/50">
                Spill the beans on prices so the rest of us can survive term time.
              </p>

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Venue name</label>
              <input
                value={submitName}
                onChange={(e) => setSubmitName(e.target.value)}
                placeholder="e.g. The Royal Oak"
                className="mb-3.5 w-full rounded-[14px] border-2 border-budget-primary bg-budget-white px-3.5 py-3 text-[15px] text-budget-text outline-none focus:ring-2 focus:ring-budget-primary/25"
              />

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Category</label>
              <div className="mb-3.5 flex gap-2">
                {(["restaurant", "pub", "cafe"] as Category[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSubmitCat(c)}
                    className={`flex-1 cursor-pointer rounded-[14px] py-2.5 text-xs font-bold text-budget-text ${
                      submitCat === c
                        ? "border-2 border-budget-primary bg-budget-surface"
                        : "border border-budget-surface bg-budget-white"
                    }`}
                  >
                    {CATS.find((x) => x.id === c)?.emoji} {CATS.find((x) => x.id === c)?.label}
                  </button>
                ))}
              </div>

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Area</label>
              <div className="mb-3.5 flex flex-wrap gap-1.5">
                {AREAS.filter((a) => a !== "All").map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSubmitArea(area)}
                    className={`cursor-pointer rounded-full border-0 px-3.5 py-2 text-xs font-semibold ${
                      submitArea === area
                        ? "bg-budget-primary text-white"
                        : "bg-budget-surface text-budget-text"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Menu & prices</label>
              {submitItems.map((item, idx) => (
                <div key={idx} className="mb-2 flex gap-2">
                  <input
                    value={item.name}
                    placeholder="Item"
                    onChange={(e) => {
                      const n = [...submitItems];
                      n[idx] = { ...n[idx], name: e.target.value };
                      setSubmitItems(n);
                    }}
                    className="budget-input-sm min-w-0 flex-1 text-sm"
                  />
                  <div className="relative shrink-0">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-budget-text/40">
                      £
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.price || ""}
                      placeholder="0.00"
                      onChange={(e) => {
                        const n = [...submitItems];
                        n[idx] = { ...n[idx], price: parseFloat(e.target.value) || 0 };
                        setSubmitItems(n);
                      }}
                      className="budget-input-sm w-[88px] pl-6 text-sm"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSubmitItems([...submitItems, { name: "", price: 0 }])}
                className="mb-3.5 w-full cursor-pointer rounded-xl border border-dashed border-budget-accent bg-transparent py-2 text-[13px] font-semibold text-budget-primary"
              >
                + Add item
              </button>

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Optional: lat / lng</label>
              <div className="mb-3.5 flex gap-2">
                <input
                  value={submitLat}
                  onChange={(e) => setSubmitLat(e.target.value)}
                  placeholder="lat"
                  className="budget-input-sm min-w-0 flex-1 text-[13px]"
                />
                <input
                  value={submitLng}
                  onChange={(e) => setSubmitLng(e.target.value)}
                  placeholder="lng"
                  className="budget-input-sm min-w-0 flex-1 text-[13px]"
                />
              </div>

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Hot take (optional)</label>
              <input
                value={submitReview}
                onChange={(e) => setSubmitReview(e.target.value)}
                placeholder="e.g. queue's long but the roti slaps"
                className="budget-input mb-5 text-sm"
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!submitName || submitItems.every((i) => !i.name || i.price <= 0)}
                className="w-full cursor-pointer rounded-2xl border-0 bg-budget-cta py-3.5 text-[15px] font-extrabold text-white shadow-budget-cta transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                Submit spot
              </button>
            </>
          )}
        </div>
      )}

      {tab === "saved" && (
        <div className="budget-tab-panel p-4">
          {savedSpots.length === 0 ? (
            <div className="px-3 py-12 text-center text-budget-text/50">
              <Bookmark size={40} strokeWidth={1.25} className="mx-auto mb-4 opacity-[0.35]" />
              <p className="text-base font-bold text-budget-text">Nothing saved yet</p>
              <p className="mt-2.5 text-sm italic">your wallet thanks you (it&apos;s empty too)</p>
            </div>
          ) : (
            savedSpots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  setTab("map");
                  setSelectedId(spot.id);
                  setFlyTo({ center: [spot.lat, spot.lng], zoom: 16 });
                }}
                className="budget-list-btn"
              >
                <span className="text-xl">{catEmoji(spot.category)}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-budget-text">{spot.name}</div>
                  <div className="text-xs text-budget-subtle">{spot.area}</div>
                </div>
                <span className="font-extrabold text-budget-primary">{formatMapPriceLabel(lowestPrice(spot))}</span>
              </button>
            ))
          )}
        </div>
      )}

      {tab === "course" && (
        <div className="budget-tab-panel p-4">
          <div className="rounded-[20px] border border-budget-surface bg-budget-white p-[18px] shadow-[0_4px_20px_rgb(13_31_26_/0.06)]">
            <h2 className="mb-2 text-lg font-extrabold text-budget-text">Budget crawl</h2>
            <p className="mb-4 text-[13px] leading-relaxed text-budget-muted">
              One coffee, one meal, one pint — cheapest trio we can find under your cap.
            </p>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-budget-text">Max spend</span>
              <span className="text-xl font-extrabold text-budget-primary">£{courseBudget}</span>
            </div>
            <input
              type="range"
              min={10}
              max={45}
              step={1}
              value={courseBudget}
              onChange={(e) => {
                setCourseBudget(parseInt(e.target.value, 10));
                setCourseResult(null);
              }}
              className="mb-4 w-full accent-budget-primary"
            />
            <button
              type="button"
              onClick={planCourse}
              className="w-full cursor-pointer rounded-2xl border-0 bg-budget-primary py-3.5 text-[15px] font-extrabold text-white"
            >
              Plan my crawl
            </button>
          </div>

          {courseResult !== null && (
            <div className="mt-4">
              {courseResult.length === 0 ? (
                <div className="rounded-2xl bg-budget-surface p-5 text-center text-sm text-budget-text">
                  No trio under £{courseBudget}. Treat yourself and bump the slider?
                </div>
              ) : (
                <div className="mt-2 rounded-[20px] border border-budget-surface bg-budget-white p-4">
                  <div className="mb-3 text-xs font-extrabold text-budget-primary">Total £{courseTotal.toFixed(2)}</div>
                  {courseResult.map((spot) => (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => {
                        setTab("map");
                        setSelectedId(spot.id);
                        setFlyTo({ center: [spot.lat, spot.lng], zoom: 16 });
                      }}
                      className="mb-2 w-full cursor-pointer rounded-[14px] border border-budget-surface bg-budget-bg px-3.5 py-3 text-left text-sm font-bold text-budget-text last:mb-0"
                    >
                      {catEmoji(spot.category)} {spot.name} — {formatMapPriceLabel(lowestPrice(spot))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <nav className="budget-bottom-nav absolute bottom-0 left-0 right-0 z-[60] flex items-stretch justify-between rounded-t-[22px] border-t border-budget-surface bg-budget-white px-1.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] pt-2.5 shadow-budget-nav">
        {(
          [
            { id: "map" as Tab, label: "Map", Icon: Map },
            { id: "community" as Tab, label: "Community", Icon: MessagesSquare },
            { id: "submit" as Tab, label: "Submit", Icon: Plus },
            { id: "saved" as Tab, label: "Saved", Icon: Bookmark },
            { id: "course" as Tab, label: "Course", Icon: Route },
          ] as const
        ).map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                if (id !== "map") setSelectedId(null);
              }}
              className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-0.5 py-1 ${
                active ? "text-budget-primary" : "text-budget-faint"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.65} />
              <span className={`text-[10px] tracking-wide ${active ? "font-bold" : "font-medium"}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
