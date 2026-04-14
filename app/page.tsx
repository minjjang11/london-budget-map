"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { MapSpot } from "./components/MapView";
import { Map, MessagesSquare, Plus, Bookmark, Route, X, Navigation } from "lucide-react";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

const C = {
  primary: "#00A878",
  accent: "#00D4A0",
  surface: "#E0F7F2",
  bg: "#F7FDFB",
  text: "#0D1F1A",
  cta: "#6A4FF0",
  white: "#ffffff",
} as const;

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

function formatMapPriceLabel(lowest: number): string {
  const pounds = `£${lowest % 1 === 0 ? lowest.toFixed(0) : lowest.toFixed(2)}`;
  return lowest < 3 ? `🔥 ${pounds}` : pounds;
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
  const [showRankingPanel, setShowRankingPanel] = useState(true);
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
        style={{
          padding: "8px 14px",
          borderRadius: 999,
          border: active ? "none" : `1px solid rgba(0, 168, 120, 0.2)`,
          background: active ? C.primary : C.surface,
          color: active ? C.white : C.text,
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{emoji}</span>
        {label}
      </button>
    );
  };

  const savedSpots = spots.filter((s) => savedIds.has(s.id));

  return (
    <div
      className="budget-app"
      style={{
        maxWidth: 440,
        margin: "0 auto",
        height: "100svh",
        background: C.bg,
        position: "relative",
        overflow: "hidden",
        color: C.text,
      }}
    >
      {/* Full-bleed map layer */}
      {tab === "map" && mounted && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <MapView spots={mapSpots} selectedId={selectedId} onSelect={handleSelect} flyTo={flyTo} />
        </div>
      )}

      {/* Floating header */}
      <header
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          zIndex: 50,
          background: C.white,
          borderRadius: 22,
          padding: "14px 16px 12px",
          boxShadow: "0 8px 32px rgba(13, 31, 26, 0.1)",
          border: "1px solid rgba(0, 168, 120, 0.12)",
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>
            Budget Map
          </h1>
          <p style={{ fontSize: 12, color: "rgba(13,31,26,0.55)", marginTop: 2, fontStyle: "italic" }}>
            because we&apos;re all broke innit
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 2,
            marginTop: 10,
          }}
        >
          {CATS.map((c) => chipCat(c.id as Category | "all", c.label, c.emoji))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${C.surface}`,
          }}
        >
          {AREAS.map((area) => {
            const active = activeArea === area;
            return (
              <button
                key={area}
                type="button"
                onClick={() => setActiveArea(area)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? C.primary : "rgba(13,31,26,0.1)"}`,
                  background: active ? C.surface : C.white,
                  color: C.text,
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {area}
              </button>
            );
          })}
        </div>
      </header>

      {/* Map overlays (only on map tab) */}
      {tab === "map" && (
        <>
          <div
            style={{
              position: "absolute",
              top: 168,
              right: 12,
              zIndex: 40,
              background: C.white,
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(13,31,26,0.55)",
              boxShadow: "0 4px 14px rgba(13,31,26,0.08)",
              border: `1px solid ${C.surface}`,
            }}
          >
            {filtered.length} spots
          </div>

          <button
            type="button"
            onClick={() => setShowRankingPanel(!showRankingPanel)}
            style={{
              position: "absolute",
              top: 168,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 40,
              background: C.white,
              border: `1px solid ${C.primary}`,
              color: C.primary,
              padding: "8px 18px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(13,31,26,0.08)",
            }}
          >
            {showRankingPanel ? "Hide ranking" : "Show ranking"}
          </button>

          {showRankingPanel && (
            <div
              style={{
                position: "absolute",
                bottom: 88,
                left: 12,
                right: 12,
                zIndex: 40,
                maxHeight: "38%",
                overflowY: "auto",
                background: C.white,
                borderRadius: 20,
                border: `1px solid ${C.surface}`,
                boxShadow: "0 -4px 24px rgba(13,31,26,0.08)",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: `1px solid ${C.surface}`,
                  fontSize: 13,
                  fontWeight: 800,
                  color: C.text,
                  position: "sticky",
                  top: 0,
                  background: C.white,
                }}
              >
                Price ranking
              </div>
              {ranked.map((spot, i) => (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(spot.id);
                    setFlyTo({ center: [spot.lat, spot.lng], zoom: 16 });
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: `1px solid ${C.surface}`,
                    background: selectedId === spot.id ? "rgba(224,247,242,0.6)" : C.white,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: i < 3 ? C.primary : "rgba(13,31,26,0.35)",
                      width: 22,
                      textAlign: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 16 }}>{catEmoji(spot.category)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{spot.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(13,31,26,0.45)" }}>{spot.area}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>
                    {formatMapPriceLabel(lowestPrice(spot))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div
              role="presentation"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 45,
                background: "rgba(13,31,26,0.25)",
                animation: "fadeIn 0.2s ease",
              }}
              onClick={() => setSelectedId(null)}
            >
              <div
                role="dialog"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  bottom: 88,
                  left: 12,
                  right: 12,
                  maxHeight: "52%",
                  overflowY: "auto",
                  background: C.white,
                  borderRadius: 22,
                  padding: "16px 16px 18px",
                  boxShadow: "0 12px 40px rgba(13,31,26,0.15)",
                  border: `1px solid ${C.surface}`,
                  animation: "slideUp 0.25s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>
                      {catEmoji(selected.category)} {CATS.find((c) => c.id === selected.category)?.label} · {selected.area}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: C.text }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(13,31,26,0.5)", marginTop: 2 }}>{selected.address}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    style={{
                      border: "none",
                      background: C.surface,
                      borderRadius: 999,
                      width: 36,
                      height: 36,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      color: C.text,
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "inline-block",
                    background: C.surface,
                    color: C.text,
                    fontWeight: 800,
                    fontSize: 15,
                    padding: "6px 14px",
                    borderRadius: 999,
                  }}
                >
                  from {formatMapPriceLabel(lowestPrice(selected))}
                </div>

                {selected.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      marginTop: 12,
                      background: C.bg,
                      borderRadius: 14,
                      padding: 12,
                      border: `1px solid ${C.surface}`,
                    }}
                  >
                    <div style={{ fontSize: 10, color: "rgba(13,31,26,0.45)", marginBottom: 6 }}>{sub.date}</div>
                    {sub.items.map((item, ii) => (
                      <div
                        key={ii}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 14,
                          marginBottom: 4,
                          color: C.text,
                        }}
                      >
                        <span>{item.name}</span>
                        <span style={{ fontWeight: 800 }}>
                          {item.price < 3 ? "🔥 " : ""}£{item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {sub.review && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          fontStyle: "italic",
                          color: "rgba(13,31,26,0.65)",
                        }}
                      >
                        &ldquo;{sub.review}&rdquo;
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => toggleSave(selected.id)}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 14,
                      border: `1px solid ${C.surface}`,
                      background: savedIds.has(selected.id) ? C.surface : C.white,
                      fontWeight: 700,
                      fontSize: 13,
                      color: C.text,
                      cursor: "pointer",
                    }}
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
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 14,
                      border: "none",
                      background: C.primary,
                      color: C.white,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
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

      {/* Community */}
      {tab === "community" && (
        <div
          style={{
            position: "absolute",
            top: 200,
            bottom: 88,
            left: 0,
            right: 0,
            overflowY: "auto",
            background: C.bg,
            padding: "0 12px 12px",
            zIndex: 20,
          }}
        >
          <p style={{ fontSize: 13, color: "rgba(13,31,26,0.55)", marginBottom: 12, paddingTop: 8 }}>
            Cheapest first — tap to fly there on the map.
          </p>
          {ranked.map((spot, i) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => {
                setTab("map");
                setSelectedId(spot.id);
                setFlyTo({ center: [spot.lat, spot.lng], zoom: 16 });
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                marginBottom: 8,
                background: C.white,
                border: `1px solid ${C.surface}`,
                borderRadius: 16,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: "0 2px 8px rgba(13,31,26,0.04)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>#{i + 1}</span>
              <span style={{ fontSize: 20 }}>{catEmoji(spot.category)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: C.text }}>{spot.name}</div>
                <div style={{ fontSize: 12, color: "rgba(13,31,26,0.45)" }}>{spot.area}</div>
              </div>
              <span style={{ fontWeight: 800, color: C.primary }}>{formatMapPriceLabel(lowestPrice(spot))}</span>
            </button>
          ))}
        </div>
      )}

      {/* Snitch / Submit */}
      {tab === "submit" && (
        <div
          style={{
            position: "absolute",
            top: 200,
            bottom: 88,
            left: 0,
            right: 0,
            overflowY: "auto",
            background: C.bg,
            padding: 16,
            zIndex: 20,
          }}
        >
          {submitDone ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.primary }}>Snitched successfully</div>
              <p style={{ fontSize: 13, color: "rgba(13,31,26,0.5)", marginTop: 8 }}>Legend — that&apos;s going on the map.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: C.text }}>Grass up a cheap eat</h2>
              <p style={{ fontSize: 12, color: "rgba(13,31,26,0.5)", marginBottom: 18 }}>
                Spill the beans on prices so the rest of us can survive term time.
              </p>

              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(13,31,26,0.55)", display: "block", marginBottom: 6 }}>Venue name</label>
              <input
                value={submitName}
                onChange={(e) => setSubmitName(e.target.value)}
                placeholder="e.g. The Royal Oak"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: `2px solid ${C.primary}`,
                  background: C.white,
                  fontSize: 15,
                  color: C.text,
                  marginBottom: 14,
                  outline: "none",
                }}
              />

              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(13,31,26,0.55)", display: "block", marginBottom: 6 }}>Category</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {(["restaurant", "pub", "cafe"] as Category[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSubmitCat(c)}
                    style={{
                      flex: 1,
                      padding: "10px 6px",
                      borderRadius: 14,
                      border: submitCat === c ? `2px solid ${C.primary}` : `1px solid ${C.surface}`,
                      background: submitCat === c ? C.surface : C.white,
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.text,
                      cursor: "pointer",
                    }}
                  >
                    {CATS.find((x) => x.id === c)?.emoji} {CATS.find((x) => x.id === c)?.label}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(13,31,26,0.55)", display: "block", marginBottom: 6 }}>Area</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {AREAS.filter((a) => a !== "All").map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSubmitArea(area)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: "none",
                      background: submitArea === area ? C.primary : C.surface,
                      color: submitArea === area ? C.white : C.text,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {area}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(13,31,26,0.55)", display: "block", marginBottom: 6 }}>Menu & prices</label>
              {submitItems.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    value={item.name}
                    placeholder="Item"
                    onChange={(e) => {
                      const n = [...submitItems];
                      n[idx] = { ...n[idx], name: e.target.value };
                      setSubmitItems(n);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: `1px solid ${C.surface}`,
                      fontSize: 14,
                      outline: "none",
                      color: C.text,
                    }}
                  />
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(13,31,26,0.4)",
                        fontSize: 14,
                      }}
                    >
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
                      style={{
                        width: 88,
                        padding: "10px 10px 10px 26px",
                        borderRadius: 12,
                        border: `1px solid ${C.surface}`,
                        fontSize: 14,
                        outline: "none",
                        color: C.text,
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSubmitItems([...submitItems, { name: "", price: 0 }])}
                style={{
                  width: "100%",
                  padding: 8,
                  marginBottom: 14,
                  borderRadius: 12,
                  border: `1px dashed ${C.accent}`,
                  background: "transparent",
                  color: C.primary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add item
              </button>

              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(13,31,26,0.55)", display: "block", marginBottom: 6 }}>Optional: lat / lng</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={submitLat}
                  onChange={(e) => setSubmitLat(e.target.value)}
                  placeholder="lat"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${C.surface}`,
                    fontSize: 13,
                    color: C.text,
                  }}
                />
                <input
                  value={submitLng}
                  onChange={(e) => setSubmitLng(e.target.value)}
                  placeholder="lng"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${C.surface}`,
                    fontSize: 13,
                    color: C.text,
                  }}
                />
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(13,31,26,0.55)", display: "block", marginBottom: 6 }}>Hot take (optional)</label>
              <input
                value={submitReview}
                onChange={(e) => setSubmitReview(e.target.value)}
                placeholder="e.g. queue's long but the roti slaps"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: `1px solid ${C.surface}`,
                  fontSize: 14,
                  marginBottom: 20,
                  outline: "none",
                  color: C.text,
                }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!submitName || submitItems.every((i) => !i.name || i.price <= 0)}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 16,
                  border: "none",
                  background: C.cta,
                  color: C.white,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  opacity: !submitName || submitItems.every((i) => !i.name || i.price <= 0) ? 0.45 : 1,
                  boxShadow: "0 8px 24px rgba(106, 79, 240, 0.35)",
                }}
              >
                Snitch this spot
              </button>
            </>
          )}
        </div>
      )}

      {/* Saved */}
      {tab === "saved" && (
        <div
          style={{
            position: "absolute",
            top: 200,
            bottom: 88,
            left: 0,
            right: 0,
            overflowY: "auto",
            background: C.bg,
            padding: 16,
            zIndex: 20,
          }}
        >
          {savedSpots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 12px", color: "rgba(13,31,26,0.5)" }}>
              <Bookmark size={40} strokeWidth={1.25} style={{ margin: "0 auto 16px", opacity: 0.35 }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Nothing saved yet</p>
              <p style={{ fontSize: 14, marginTop: 10, fontStyle: "italic" }}>your wallet thanks you (it&apos;s empty too)</p>
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
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  marginBottom: 8,
                  background: C.white,
                  border: `1px solid ${C.surface}`,
                  borderRadius: 16,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 20 }}>{catEmoji(spot.category)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text }}>{spot.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(13,31,26,0.45)" }}>{spot.area}</div>
                </div>
                <span style={{ fontWeight: 800, color: C.primary }}>{formatMapPriceLabel(lowestPrice(spot))}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Course */}
      {tab === "course" && (
        <div
          style={{
            position: "absolute",
            top: 200,
            bottom: 88,
            left: 0,
            right: 0,
            overflowY: "auto",
            background: C.bg,
            padding: 16,
            zIndex: 20,
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 20,
              padding: 18,
              border: `1px solid ${C.surface}`,
              boxShadow: "0 4px 20px rgba(13,31,26,0.06)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: C.text }}>Budget crawl</h2>
            <p style={{ fontSize: 13, color: "rgba(13,31,26,0.55)", lineHeight: 1.5, marginBottom: 16 }}>
              One coffee, one meal, one pint — cheapest trio we can find under your cap.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Max spend</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>£{courseBudget}</span>
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
              style={{ width: "100%", accentColor: C.primary, marginBottom: 16 }}
            />
            <button
              type="button"
              onClick={planCourse}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 16,
                border: "none",
                background: C.primary,
                color: C.white,
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Plan my crawl
            </button>
          </div>

          {courseResult !== null && (
            <div style={{ marginTop: 16 }}>
              {courseResult.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    background: C.surface,
                    borderRadius: 16,
                    color: C.text,
                    fontSize: 14,
                  }}
                >
                  No trio under £{courseBudget}. Treat yourself and bump the slider?
                </div>
              ) : (
                <div
                  style={{
                    background: C.white,
                    borderRadius: 20,
                    padding: 16,
                    border: `1px solid ${C.surface}`,
                    marginTop: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.primary, marginBottom: 12 }}>
                    Total £{courseTotal.toFixed(2)}
                  </div>
                  {courseResult.map((spot) => (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => {
                        setTab("map");
                        setSelectedId(spot.id);
                        setFlyTo({ center: [spot.lat, spot.lng], zoom: 16 });
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        marginBottom: 8,
                        borderRadius: 14,
                        border: `1px solid ${C.surface}`,
                        background: C.bg,
                        textAlign: "left",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: C.text,
                      }}
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

      {/* Bottom nav — floating pill */}
      <nav
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
          zIndex: 60,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 8px",
          background: C.white,
          borderRadius: 999,
          boxShadow: "0 8px 32px rgba(13, 31, 26, 0.12)",
          border: `1px solid ${C.surface}`,
        }}
      >
        {(
          [
            { id: "map" as Tab, label: "Map", Icon: Map },
            { id: "community" as Tab, label: "Community", Icon: MessagesSquare },
            { id: "submit" as Tab, label: "Snitch 🐀", Icon: Plus },
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
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "6px 2px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: active ? C.primary : "rgba(13,31,26,0.38)",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, letterSpacing: id === "submit" ? 0 : 0.02 }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
