"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { MapSpot } from "./components/MapView";
import {
  Search, Plus, Bookmark, BookmarkCheck, Home,
  Navigation, X, ChevronDown, MapPin, Camera, Route, Sparkles,
  ArrowRight, Trash2, Check, Trophy, MapPinned,
} from "lucide-react";
import type { Category, Spot, MenuItem, Submission } from "./korea-data";
import {
  CATS,
  PRICE_CAPS,
  WORD_POOL,
  FUNC_WORDS,
  SEED_SPOTS,
  LS_KEY,
  LS_SAVED,
  KOREAN_REGIONS,
  formatKrw,
} from "./korea-data";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

type Tab = "home" | "search" | "submit" | "saved" | "course";

type SearchResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/* ─── Helpers ──────────────────────────────────────────────── */

function loadSpots(): Spot[] {
  if (typeof window === "undefined") return SEED_SPOTS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_SPOTS));
      return SEED_SPOTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Invalid data");
    return (parsed as Spot[]).map((s) => ({
      ...s,
      region:
        typeof s.region === "string" && (KOREAN_REGIONS as readonly string[]).includes(s.region)
          ? s.region
          : "서울",
    }));
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(SEED_SPOTS));
    return SEED_SPOTS;
  }
}

function saveSpots(spots: Spot[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(spots));
  } catch {
    console.warn("Storage quota exceeded — photo may be too large");
  }
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
  } catch {}
}

function lowestPrice(spot: Spot): number {
  let min = Infinity;
  spot.submissions.forEach((s) => s.items.forEach((i) => { if (i.price < min) min = i.price; }));
  return min === Infinity ? 0 : min;
}

function catColor(c: Category) { return CATS.find((x) => x.id === c)!.color; }
function catEmoji(c: Category) { return CATS.find((x) => x.id === c)!.emoji; }

function resizeImage(file: File, maxW: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxW / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ─── Word Review Component ────────────────────────────────── */

function WordReview({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const words = value ? value.split(" ") : [];
  const addWord = (w: string) => {
    if (words.length >= 40) return;
    onChange([...words, w].join(" "));
  };
  const removeLastWord = () => {
    const next = [...words];
    next.pop();
    onChange(next.join(" "));
  };

  return (
    <div>
      <div style={{
        minHeight: 48, padding: "8px 10px", borderRadius: 14,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 10, fontSize: 14, color: "#f0ede0", lineHeight: 1.6,
        display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center",
      }}>
        {words.length === 0 && <span style={{ color: "#4b5563" }}>아래 단어를 눌러 리뷰를 만드세요…</span>}
        {words.map((w, i) => (
          <span key={i} style={{
            background: "rgba(199,255,77,0.12)", padding: "2px 7px", borderRadius: 8,
            fontSize: 13, color: "#c7ff4d", fontWeight: 600,
          }}>{w}</span>
        ))}
        {words.length > 0 && (
          <button onClick={removeLastWord} style={{
            background: "rgba(244,63,94,0.15)", border: "none", borderRadius: 8,
            padding: "3px 7px", cursor: "pointer", color: "#F43F5E", fontSize: 11, fontWeight: 700,
          }}>⌫</button>
        )}
      </div>
      <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 6 }}>{words.length}/40 단어</div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>단어</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {WORD_POOL.map((w) => (
            <button key={w} onClick={() => addWord(w)} disabled={words.length >= 40} style={{
              padding: "5px 10px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)",
              color: "#d1d5db", fontSize: 12, fontWeight: 500, cursor: "pointer",
              opacity: words.length >= 40 ? 0.3 : 1,
            }}>{w}</button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>조사·접속</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {FUNC_WORDS.map((w) => (
            <button key={w} onClick={() => addWord(w)} disabled={words.length >= 40} style={{
              padding: "5px 10px", borderRadius: 10,
              border: "1px solid rgba(199,255,77,0.15)", background: "rgba(199,255,77,0.07)",
              color: "#c7ff4d", fontSize: 12, fontWeight: 500, cursor: "pointer",
              opacity: words.length >= 40 ? 0.3 : 1,
            }}>{w}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ─────────────────────────────────────────────── */

export default function App() {
  const [spots, setSpots]         = useState<Spot[]>([]);
  const [savedIds, setSavedIds]   = useState<Set<string>>(new Set());
  const [tab, setTab]             = useState<Tab>("home");
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const [regionFilter, setRegionFilter] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery]         = useState("");
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [layoutWide, setLayoutWide] = useState(false);

  // Submit state
  const [submitStep, setSubmitStep] = useState<"search" | "form">("search");
  const [submitQuery, setSubmitQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitSpot, setSubmitSpot] = useState<{ name: string; lat: number; lng: number; address: string } | null>(null);
  const [submitCat, setSubmitCat]   = useState<Category>("restaurant");
  const [submitRegion, setSubmitRegion] = useState<string>("서울");
  const [submitItems, setSubmitItems] = useState<MenuItem[]>([{ name: "", price: 0 }]);
  const [submitPhoto, setSubmitPhoto] = useState<string>("");
  const [submitReview, setSubmitReview] = useState("");
  const [submitDone, setSubmitDone]   = useState(false);

  // Course planner (원화 합산)
  const [courseBudget, setCourseBudget] = useState(35_000);
  const [courseResult, setCourseResult] = useState<Spot[] | null>(null);

  const [mounted, setMounted] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setMounted(true);
    setSpots(loadSpots());
    setSavedIds(loadSaved());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const fn = () => setLayoutWide(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  // Persist
  useEffect(() => { if (spots.length) saveSpots(spots); }, [spots]);
  useEffect(() => { saveSavedIds(savedIds); }, [savedIds]);

  const filtered = useMemo(() => spots.filter((s) => {
    if (activeCat !== "all" && s.category !== activeCat) return false;
    if (regionFilter !== "all" && s.region !== regionFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return [s.name, s.address, s.region, s.category].join(" ").toLowerCase().includes(q)
        || s.submissions.some((sub) => sub.items.some((i) => i.name.toLowerCase().includes(q)));
    }
    return true;
  }), [spots, activeCat, regionFilter, query]);

  const rankedByPrice = useMemo(
    () => [...filtered].sort((a, b) => lowestPrice(a) - lowestPrice(b)),
    [filtered],
  );

  const mapSpots: MapSpot[] = useMemo(() => filtered.map((s) => ({
    id: s.id, name: s.name, category: s.category,
    lat: s.lat, lng: s.lng,
    lowestPrice: lowestPrice(s),
    priceLabel: formatKrw(lowestPrice(s)),
  })), [filtered]);

  const selected = spots.find((s) => s.id === selectedId) || null;

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  // Nominatim search
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const doSearch = (q: string) => {
    setSubmitQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 3) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=kr&viewbox=124.5,33.0,132.0,38.8&bounded=1&limit=8`;
        const res = await fetch(url, { headers: { "Accept-Language": "ko" } });
        const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
        setSearchResults(data.map((r) => ({
          name: r.display_name.split(",")[0],
          address: r.display_name.split(",").slice(0, 3).join(","),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
      } catch { setSearchResults([]); }
    }, 400);
  };

  // Also search existing spots
  const existingMatches = useMemo(() => {
    if (submitQuery.length < 2) return [];
    const q = submitQuery.toLowerCase();
    return spots.filter((s) => s.name.toLowerCase().includes(q));
  }, [submitQuery, spots]);

  const handleSubmit = () => {
    setSubmitError("");
    if (!submitSpot) { setSubmitError("먼저 장소를 선택하세요."); return; }
    const validItems = submitItems.filter((i) => i.name && i.price > 0);
    if (validItems.length === 0) { setSubmitError("가격이 있는 메뉴를 1개 이상 입력하세요."); return; }
    const cap = PRICE_CAPS[submitCat];
    const overCap = validItems.some((i) => i.price > cap);
    if (overCap) { setSubmitError(`항목당 최대 ${formatKrw(cap)}(카테고리 한도)를 넘었습니다.`); return; }

    const newSubmission: Submission = {
      id: `sub_${Date.now()}`,
      items: validItems,
      photo: submitPhoto || undefined,
      review: submitReview || undefined,
      date: new Date().toISOString().split("T")[0],
    };

    const existingIdx = spots.findIndex(
      (s) => s.name.toLowerCase() === submitSpot.name.toLowerCase()
        && Math.abs(s.lat - submitSpot.lat) < 0.002
    );

    if (existingIdx >= 0) {
      const updated = [...spots];
      updated[existingIdx] = {
        ...updated[existingIdx],
        category: submitCat,
        submissions: [...updated[existingIdx].submissions, newSubmission],
      };
      setSpots(updated);
    } else {
      const newSpot: Spot = {
        id: `spot_${Date.now()}`,
        name: submitSpot.name,
        category: submitCat,
        lat: submitSpot.lat,
        lng: submitSpot.lng,
        address: submitSpot.address,
        region: submitRegion,
        submissions: [newSubmission],
      };
      setSpots([...spots, newSpot]);
    }

    setSubmitDone(true);
    setTimeout(() => {
      setSubmitDone(false);
      setSubmitStep("search");
      setSubmitQuery("");
      setSubmitSpot(null);
      setSubmitItems([{ name: "", price: 0 }]);
      setSubmitPhoto("");
      setSubmitReview("");
      setSubmitRegion("서울");
    }, 2000);
  };

  // Course planner
  const planCourse = () => {
    const byCategory: Record<Category, Spot[]> = { pub: [], restaurant: [], cafe: [] };
    spots.forEach((s) => byCategory[s.category].push(s));

    let best: Spot[] | null = null;
    let bestTotal = Infinity;

    const cats: Category[] = ["pub", "restaurant", "cafe"];
    const pools = cats.map((c) => byCategory[c]);

    if (pools.some((p) => p.length === 0)) {
      setCourseResult([]);
      return;
    }

    for (const pub of pools[0]) {
      for (const rest of pools[1]) {
        for (const cafe of pools[2]) {
          const total = lowestPrice(pub) + lowestPrice(rest) + lowestPrice(cafe);
          if (total <= courseBudget && total < bestTotal) {
            bestTotal = total;
            best = [cafe, rest, pub];
          }
        }
      }
    }

    setCourseResult(best || []);
  };

  const courseTotalPrice = courseResult
    ? courseResult.reduce((sum, s) => sum + lowestPrice(s), 0)
    : 0;

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <div style={{
      width: "100%", maxWidth: "100%", margin: 0, height: "100svh",
      background: "#07080d", color: "#f0ede0",
      position: "relative", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* ── HEADER ── */}
      <header style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 40,
        padding: "14px 16px 0",
        background: tab === "home" ? "linear-gradient(#07080dee 60%, transparent)" : "#0d1018",
        borderBottom: tab === "home" ? "none" : "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: "linear-gradient(135deg,#c7ff4d,#ffcf4a)",
              display: "grid", placeItems: "center",
              color: "#10130a", fontWeight: 900, fontSize: 16,
              boxShadow: "0 6px 20px rgba(199,255,77,0.22)",
            }}>거</div>
            <div>
              <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase" }}>한국 저가 맛집 · 지도 추리</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1 }}>거지맵</div>
            </div>
          </div>
        </div>

        {/* Category chips */}
        {(tab === "home" || tab === "search") && (
          <div style={{ display: "flex", gap: 7, paddingBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            {[{ id: "all", emoji: "📍", label: "전체", color: "#c7ff4d" }, ...CATS].map((c) => {
              const isActive = activeCat === c.id;
              return (
                <button key={c.id} onClick={() => { setActiveCat(c.id as Category | "all"); setSelectedId(null); }} style={{
                  border: isActive ? `1.5px solid ${c.color}55` : "1.5px solid rgba(255,255,255,0.08)",
                  borderRadius: 999, padding: "6px 13px", whiteSpace: "nowrap",
                  background: isActive ? `${c.color}20` : "rgba(255,255,255,0.04)",
                  color: isActive ? c.color : "#6b7280",
                  fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: "pointer",
                  backdropFilter: "blur(6px)", transition: "all 150ms",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ fontSize: 14 }}>{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Region filter */}
        {(tab === "home" || tab === "search") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, overflowX: "auto", scrollbarWidth: "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, fontSize: 11, color: "#6b7280", fontWeight: 700 }}>
              <MapPinned size={13} /> 지역
            </span>
            {(["all", ...KOREAN_REGIONS] as const).map((r) => {
              const id = r === "all" ? "all" : r;
              const label = r === "all" ? "전국" : r;
              const isActive = regionFilter === id;
              return (
                <button
                  key={String(id)}
                  type="button"
                  onClick={() => { setRegionFilter(id); setSelectedId(null); }}
                  style={{
                    flexShrink: 0,
                    border: isActive ? "1.5px solid #c7ff4d88" : "1.5px solid rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    padding: "5px 11px",
                    background: isActive ? "rgba(199,255,77,0.18)" : "rgba(255,255,255,0.04)",
                    color: isActive ? "#c7ff4d" : "#6b7280",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ── HOME: MAP + 랭킹 ── */}
      {tab === "home" && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          position: "relative",
          paddingTop: layoutWide ? 118 : 158,
        }}>
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: layoutWide ? "row" : "column",
            minHeight: 0,
          }}>
            <aside style={{
              width: layoutWide ? 292 : "100%",
              maxHeight: layoutWide ? "100%" : 220,
              flexShrink: 0,
              borderRight: layoutWide ? "1px solid rgba(255,255,255,0.08)" : "none",
              borderBottom: layoutWide ? "none" : "1px solid rgba(255,255,255,0.08)",
              background: "rgba(9,11,18,0.96)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 20,
            }}>
              <div style={{
                padding: "10px 12px 6px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#c7ff4d", display: "flex", alignItems: "center", gap: 6 }}>
                  <Trophy size={15} /> 가격순 랭킹
                </div>
                <span style={{ fontSize: 10, color: "#4b5563" }}>{rankedByPrice.length}곳</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 10px" }}>
                {rankedByPrice.length === 0 && (
                  <div style={{ fontSize: 12, color: "#4b5563", textAlign: "center", padding: "20px 8px" }}>
                    조건에 맞는 장소가 없습니다.
                  </div>
                )}
                {rankedByPrice.map((spot, idx) => {
                  const isSel = spot.id === selectedId;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(spot.id);
                        setFlyTo({ center: [spot.lat, spot.lng], zoom: 14 });
                      }}
                      style={{
                        width: "100%",
                        marginBottom: 6,
                        borderRadius: 14,
                        border: isSel ? `1.5px solid ${catColor(spot.category)}` : "1px solid rgba(255,255,255,0.07)",
                        background: isSel ? "rgba(255,255,255,0.08)" : "#0d1422",
                        padding: "10px 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        color: "#f0ede0",
                      }}
                    >
                      <span style={{
                        minWidth: 26,
                        height: 26,
                        borderRadius: 8,
                        background: idx < 3 ? "linear-gradient(135deg,#c7ff4d,#ffcf4a)" : "rgba(255,255,255,0.08)",
                        color: idx < 3 ? "#080a0d" : "#9ca3af",
                        fontWeight: 900,
                        fontSize: 12,
                        display: "grid",
                        placeItems: "center",
                      }}>{idx + 1}</span>
                      <span style={{ fontSize: 18 }}>{catEmoji(spot.category)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{spot.name}</div>
                        <div style={{ fontSize: 10, color: "#4b5563" }}>{spot.region} · {spot.address}</div>
                      </div>
                      <span style={{
                        flexShrink: 0,
                        background: `${catColor(spot.category)}cc`,
                        color: "#080a0d",
                        fontWeight: 900,
                        fontSize: 11,
                        padding: "4px 8px",
                        borderRadius: 999,
                      }}>{formatKrw(lowestPrice(spot))}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div style={{ flex: 1, position: "relative", minHeight: layoutWide ? 0 : 280 }}>
              {mounted && (
                <MapView
                  spots={mapSpots}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  flyTo={flyTo}
                />
              )}

              <div style={{
                position: "absolute", top: 12, right: 12, zIndex: 30,
                background: "rgba(7,8,13,0.85)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "6px 10px", backdropFilter: "blur(10px)",
                fontSize: 11, color: "#6b7280", fontWeight: 600,
              }}>
                지도 {filtered.length}곳
              </div>
            </div>
          </div>

          {/* Detail card */}
          {selected && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 35,
              background: "linear-gradient(180deg,#0d1421,#09101a)",
              borderRadius: "22px 22px 0 0",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "14px 16px 100px",
              boxShadow: "0 -16px 44px rgba(0,0,0,0.6)",
              animation: "slideUp 250ms ease",
              maxHeight: "60vh", overflowY: "auto",
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", margin: "0 auto 12px" }} />
              <button onClick={() => setSelectedId(null)} style={{
                position: "absolute", top: 12, right: 14,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "50%", width: 30, height: 30, display: "grid", placeItems: "center",
                cursor: "pointer", color: "#9ca3af",
              }}><X size={14} /></button>

              {/* Spot header */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: `${catColor(selected.category)}20`,
                  border: `1.5px solid ${catColor(selected.category)}40`,
                  display: "grid", placeItems: "center", fontSize: 22,
                }}>{catEmoji(selected.category)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: catColor(selected.category), fontWeight: 700, letterSpacing: "0.04em" }}>
                    {CATS.find((c) => c.id === selected.category)?.label ?? selected.category} · {selected.region} · {selected.address}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em" }}>{selected.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{
                      background: `linear-gradient(135deg,${catColor(selected.category)}dd,${catColor(selected.category)}99)`,
                      color: "#080a0d", fontWeight: 900, fontSize: 14, padding: "4px 10px", borderRadius: 999,
                    }}>최저 {formatKrw(lowestPrice(selected))}</span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>제보 {selected.submissions.length}건</span>
                  </div>
                </div>
              </div>

              {/* Submissions */}
              {selected.submissions.map((sub, si) => (
                <div key={sub.id} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: 12, marginBottom: 10,
                  animation: `cardIn 220ms ease ${si * 0.08}s both`,
                }}>
                  <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 6 }}>제보 · {sub.date}</div>
                  {sub.photo && (
                    <img src={sub.photo} alt="" style={{
                      width: "100%", height: 140, objectFit: "cover",
                      borderRadius: 12, marginBottom: 8,
                    }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
                    {sub.items.map((item, ii) => (
                      <div key={ii} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#d1d5db" }}>{item.name}</span>
                        <span style={{ color: catColor(selected.category), fontWeight: 800 }}>{formatKrw(item.price)}</span>
                      </div>
                    ))}
                  </div>
                  {sub.review && (
                    <div style={{
                      padding: "8px 10px", borderRadius: 12,
                      background: "rgba(199,255,77,0.06)", borderLeft: "3px solid #c7ff4d",
                      fontSize: 13, color: "#b8cca0", lineHeight: 1.5, fontStyle: "italic",
                    }}>
                      "{sub.review}"
                    </div>
                  )}
                </div>
              ))}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggleSave(selected.id)} style={{
                  flex: 1, padding: "11px 0", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: savedIds.has(selected.id) ? "#c7ff4d" : "rgba(255,255,255,0.06)",
                  color: savedIds.has(selected.id) ? "#080a0d" : "#f0ede0",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  {savedIds.has(selected.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  {savedIds.has(selected.id) ? "저장됨" : "저장"}
                </button>
                <button onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`;
                  window.open(url, "_blank");
                }} style={{
                  flex: 1, padding: "11px 0", borderRadius: 14, border: "none",
                  background: `linear-gradient(135deg,${catColor(selected.category)},${catColor(selected.category)}bb)`,
                  color: "#080a0d", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Navigation size={14} /> 길찾기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SEARCH TAB ── */}
      {tab === "search" && (
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 158, paddingBottom: 90, scrollbarWidth: "none" }}>
          <div style={{ padding: "0 16px" }}>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <Search size={15} color="#4b5563" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="이름, 지역, 메뉴로 검색…" autoFocus
                style={{
                  width: "100%", padding: "12px 13px 12px 36px", borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)", color: "#f0ede0",
                  outline: "none", fontSize: 14, fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((spot, i) => (
                <button key={spot.id} onClick={() => {
                  setSelectedId(spot.id);
                  setFlyTo({ center: [spot.lat, spot.lng], zoom: 15 });
                  setTab("home");
                }} style={{
                  borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)",
                  background: "#0d1422", padding: "12px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  animation: `cardIn 200ms ease ${i * 0.04}s both`,
                  cursor: "pointer", textAlign: "left", color: "#f0ede0", width: "100%",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{catEmoji(spot.category)}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{spot.name}</div>
                      <div style={{ fontSize: 11, color: "#4b5563" }}>{spot.region} · {spot.address}</div>
                    </div>
                  </div>
                  <span style={{
                    background: `${catColor(spot.category)}cc`, color: "#080a0d",
                    fontWeight: 900, fontSize: 12, padding: "3px 8px", borderRadius: 999,
                  }}>{formatKrw(lowestPrice(spot))}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#4b5563", fontSize: 14 }}>
                  {query ? "검색 결과가 없습니다." : "검색어를 입력해 보세요."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMIT TAB ── */}
      {tab === "submit" && (
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 135, paddingBottom: 90, scrollbarWidth: "none" }}>
          <div style={{ padding: "0 16px" }}>
            {submitDone ? (
              <div style={{
                marginTop: 40, textAlign: "center", padding: "30px 20px",
                borderRadius: 24, background: "rgba(199,255,77,0.08)",
                border: "1px solid rgba(199,255,77,0.2)",
                animation: "cardIn 300ms ease",
              }}>
                <Check size={40} color="#c7ff4d" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 18, fontWeight: 800, color: "#c7ff4d" }}>제보 완료</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>지도에 반영되었습니다.</div>
              </div>
            ) : submitStep === "search" ? (
              /* Step 1: Search for spot */
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>1단계</div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 14 }}>장소 찾기</div>
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <Search size={15} color="#4b5563" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    value={submitQuery} onChange={(e) => doSearch(e.target.value)}
                    placeholder="식당·술집·카페 이름 또는 주소…"
                    style={{
                      width: "100%", padding: "12px 13px 12px 36px", borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.05)", color: "#f0ede0",
                      outline: "none", fontSize: 14, fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* Existing spots */}
                {existingMatches.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#c7ff4d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>이미 등록된 곳</div>
                    {existingMatches.map((s) => (
                      <button key={s.id} onClick={() => {
                        setSubmitSpot({ name: s.name, lat: s.lat, lng: s.lng, address: s.address });
                        setSubmitCat(s.category);
                        setSubmitRegion(s.region);
                        setSubmitStep("form");
                      }} style={{
                        width: "100%", padding: "10px 12px", borderRadius: 14,
                        border: "1px solid rgba(199,255,77,0.2)", background: "rgba(199,255,77,0.06)",
                        color: "#f0ede0", cursor: "pointer", marginBottom: 6,
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                      }}>
                        <span style={{ fontSize: 18 }}>{catEmoji(s.category)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "#4b5563" }}>{s.address}</div>
                        </div>
                        <ArrowRight size={16} color="#c7ff4d" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Nominatim results */}
                {searchResults.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>검색 결과</div>
                    {searchResults.map((r, i) => (
                      <button key={i} onClick={() => {
                        setSubmitSpot({ name: r.name, lat: r.lat, lng: r.lng, address: r.address });
                        setSubmitRegion("서울");
                        setSubmitStep("form");
                      }} style={{
                        width: "100%", padding: "10px 12px", borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
                        color: "#f0ede0", cursor: "pointer", marginBottom: 6,
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                      }}>
                        <MapPin size={16} color="#6b7280" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#4b5563" }}>{r.address}</div>
                        </div>
                        <ArrowRight size={16} color="#6b7280" />
                      </button>
                    ))}
                  </div>
                )}

                {submitQuery.length >= 3 && searchResults.length === 0 && existingMatches.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "#4b5563", fontSize: 13 }}>
                    결과가 없습니다. 다른 검색어를 시도해 보세요.
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Fill in details */
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setSubmitStep("search")} style={{
                  background: "none", border: "none", color: "#c7ff4d", fontSize: 13,
                  cursor: "pointer", marginBottom: 10, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 4,
                }}>← 뒤로</button>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>2단계</div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>
                  {submitSpot?.name} 제보
                </div>

                {/* Category select */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>카테고리</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {CATS.map((c) => (
                      <button key={c.id} onClick={() => setSubmitCat(c.id)} style={{
                        flex: 1, padding: "10px 6px", borderRadius: 14,
                        border: submitCat === c.id ? `1.5px solid ${c.color}` : "1.5px solid rgba(255,255,255,0.08)",
                        background: submitCat === c.id ? `${c.color}20` : "rgba(255,255,255,0.04)",
                        color: submitCat === c.id ? c.color : "#6b7280",
                        cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 18 }}>{c.emoji}</div>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "#4b5563", marginTop: 4 }}>
                    메뉴 1개당 최대 {formatKrw(PRICE_CAPS[submitCat])}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>지역 (시·도)</div>
                  <select
                    value={submitRegion}
                    onChange={(e) => setSubmitRegion(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#f0ede0",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                  >
                    {KOREAN_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Menu items */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>메뉴 & 가격 (원)</div>
                  {submitItems.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                      <input
                        value={item.name} placeholder="메뉴명"
                        onChange={(e) => {
                          const next = [...submitItems];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setSubmitItems(next);
                        }}
                        style={{
                          flex: 1, padding: "10px 12px", borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.04)", color: "#f0ede0",
                          outline: "none", fontSize: 13, fontFamily: "inherit",
                        }}
                      />
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: 12 }}>₩</span>
                        <input
                          type="number" step={100} min={0} max={PRICE_CAPS[submitCat]}
                          value={item.price || ""} placeholder="0"
                          onChange={(e) => {
                            const next = [...submitItems];
                            next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                            setSubmitItems(next);
                          }}
                          style={{
                            width: 100, padding: "10px 10px 10px 26px", borderRadius: 12,
                            border: item.price > PRICE_CAPS[submitCat]
                              ? "1px solid #F43F5E"
                              : "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.04)", color: "#f0ede0",
                            outline: "none", fontSize: 13, fontFamily: "inherit",
                          }}
                        />
                      </div>
                      {submitItems.length > 1 && (
                        <button onClick={() => setSubmitItems(submitItems.filter((_, i) => i !== idx))} style={{
                          background: "none", border: "none", cursor: "pointer", color: "#F43F5E", padding: 4,
                        }}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                  {submitItems.some((i) => i.price > PRICE_CAPS[submitCat]) && (
                    <div style={{ fontSize: 11, color: "#F43F5E", marginBottom: 4 }}>
                      한도 {formatKrw(PRICE_CAPS[submitCat])}를 초과했습니다.
                    </div>
                  )}
                  <button onClick={() => setSubmitItems([...submitItems, { name: "", price: 0 }])} style={{
                    width: "100%", padding: "8px", borderRadius: 12,
                    border: "1px dashed rgba(255,255,255,0.1)", background: "transparent",
                    color: "#6b7280", cursor: "pointer", fontSize: 12,
                  }}>+ 메뉴 추가</button>
                </div>

                {/* Photo */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>사진</div>
                  {submitPhoto ? (
                    <div style={{ position: "relative" }}>
                      <img src={submitPhoto} alt="" style={{
                        width: "100%", height: 160, objectFit: "cover", borderRadius: 14,
                      }} />
                      <button onClick={() => setSubmitPhoto("")} style={{
                        position: "absolute", top: 8, right: 8,
                        background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
                        width: 28, height: 28, display: "grid", placeItems: "center",
                        cursor: "pointer", color: "#fff",
                      }}><X size={14} /></button>
                    </div>
                  ) : (
                    <label style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "16px", borderRadius: 14,
                      border: "1px dashed rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)",
                      cursor: "pointer", color: "#6b7280", fontSize: 13,
                    }}>
                      <Camera size={18} /> 사진 추가
                      <input type="file" accept="image/*" hidden onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) setSubmitPhoto(await resizeImage(file, 400));
                      }} />
                    </label>
                  )}
                </div>

                {/* Review */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>리뷰 (단어 타일만)</div>
                  <WordReview value={submitReview} onChange={setSubmitReview} />
                </div>

                {/* Error message */}
                {submitError && (
                  <div style={{
                    padding: "10px 12px", borderRadius: 12, marginBottom: 10,
                    background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)",
                    fontSize: 13, color: "#F43F5E", fontWeight: 600,
                  }}>{submitError}</div>
                )}

                {/* Submit button */}
                <button onClick={handleSubmit} disabled={
                  !submitSpot || submitItems.every((i) => !i.name || i.price <= 0)
                  || submitItems.some((i) => i.price > PRICE_CAPS[submitCat])
                } style={{
                  width: "100%", padding: "14px", borderRadius: 16, border: "none",
                  background: "linear-gradient(135deg,#c7ff4d,#ffcf4a)",
                  color: "#080a0d", fontWeight: 800, fontSize: 15, cursor: "pointer",
                  opacity: (!submitSpot || submitItems.every((i) => !i.name || i.price <= 0)) ? 0.4 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <Plus size={16} /> 제보 보내기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SAVED TAB ── */}
      {tab === "saved" && (
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 135, paddingBottom: 90, scrollbarWidth: "none" }}>
          <div style={{ padding: "0 16px" }}>
            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 8, marginBottom: 10 }}>
              저장 {spots.filter((s) => savedIds.has(s.id)).length}곳
            </div>
            {spots.filter((s) => savedIds.has(s.id)).length === 0 && (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#4b5563" }}>
                <Bookmark size={36} color="#1f2a38" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 14 }}>저장된 장소가 없습니다.</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>지도에서 북마크를 눌러 저장해 보세요.</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {spots.filter((s) => savedIds.has(s.id)).map((spot, i) => (
                <button key={spot.id} onClick={() => {
                  setSelectedId(spot.id);
                  setFlyTo({ center: [spot.lat, spot.lng], zoom: 15 });
                  setTab("home");
                }} style={{
                  borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)",
                  background: "#0d1422", padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", textAlign: "left", color: "#f0ede0", width: "100%",
                  animation: `cardIn 200ms ease ${i * 0.05}s both`,
                }}>
                  <span style={{ fontSize: 20 }}>{catEmoji(spot.category)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{spot.name}</div>
                    <div style={{ fontSize: 11, color: "#4b5563" }}>{spot.region} · {spot.address}</div>
                  </div>
                  <span style={{
                    background: `${catColor(spot.category)}cc`, color: "#080a0d",
                    fontWeight: 900, fontSize: 12, padding: "3px 8px", borderRadius: 999,
                  }}>{formatKrw(lowestPrice(spot))}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── COURSE TAB ── */}
      {tab === "course" && (
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 135, paddingBottom: 90, scrollbarWidth: "none" }}>
          <div style={{ padding: "0 16px" }}>
            <div style={{
              borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)",
              background: "#0d1422", padding: 16, marginTop: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Route size={18} color="#c7ff4d" />
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em" }}>예산 코스</div>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 14 }}>
                카페·식당·술집 각 1곳씩, 합산 최저가가 예산 안에 들어가는 조합을 찾아 드립니다.
              </p>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>총 예산</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#c7ff4d" }}>{formatKrw(courseBudget)}</span>
                </div>
                <input
                  type="range" min={15_000} max={90_000} step={1000}
                  value={courseBudget} onChange={(e) => { setCourseBudget(parseInt(e.target.value, 10)); setCourseResult(null); }}
                  style={{ width: "100%", accentColor: "#c7ff4d" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4b5563" }}>
                  <span>{formatKrw(15_000)}</span><span>{formatKrw(90_000)}</span>
                </div>
              </div>

              <button onClick={planCourse} style={{
                width: "100%", padding: "13px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg,#c7ff4d,#ffcf4a)",
                color: "#080a0d", fontWeight: 800, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <Sparkles size={16} /> 코스 짜기
              </button>
            </div>

            {/* Result */}
            {courseResult !== null && (
              <div style={{ marginTop: 14 }}>
                {courseResult.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "30px 16px",
                    borderRadius: 18, border: "1px solid rgba(244,63,94,0.2)",
                    background: "rgba(244,63,94,0.06)",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#F43F5E" }}>조합을 찾지 못했어요</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>예산을 늘리거나 제보를 더 모아 보세요.</div>
                  </div>
                ) : (
                  <div style={{
                    borderRadius: 18, border: "1px solid rgba(199,255,77,0.15)",
                    background: "rgba(199,255,77,0.04)", padding: 14,
                  }}>
                    <div style={{ fontSize: 10, color: "#c7ff4d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      최적 조합 · 합계 {formatKrw(courseTotalPrice)}
                    </div>
                    {courseResult.map((spot, i) => (
                      <div key={spot.id}>
                        <button onClick={() => {
                          setSelectedId(spot.id);
                          setFlyTo({ center: [spot.lat, spot.lng], zoom: 15 });
                          setTab("home");
                        }} style={{
                          width: "100%", padding: "10px 12px", borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.07)", background: "#0d1422",
                          color: "#f0ede0", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 12,
                            background: `${catColor(spot.category)}20`,
                            display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0,
                          }}>{catEmoji(spot.category)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{spot.name}</div>
                            <div style={{ fontSize: 11, color: "#4b5563" }}>{CATS.find((c) => c.id === spot.category)?.label ?? spot.category}</div>
                          </div>
                          <span style={{
                            background: `${catColor(spot.category)}cc`, color: "#080a0d",
                            fontWeight: 900, fontSize: 12, padding: "3px 8px", borderRadius: 999,
                          }}>{formatKrw(lowestPrice(spot))}</span>
                        </button>
                        {i < courseResult.length - 1 && (
                          <div style={{ textAlign: "center", padding: "4px 0" }}>
                            <ChevronDown size={16} color="#4b5563" />
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{
                      marginTop: 10, padding: "10px 12px", borderRadius: 12,
                      background: "rgba(199,255,77,0.08)", textAlign: "center",
                      fontSize: 14, fontWeight: 800, color: "#c7ff4d",
                    }}>
                      예산 {formatKrw(courseBudget)} 중 {formatKrw(courseBudget - courseTotalPrice)} 남음
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <nav style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 40,
        padding: "6px 12px 20px",
        background: "linear-gradient(transparent, #07080d 24%)",
        pointerEvents: "none",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5,1fr)",
          padding: 5, gap: 3,
          borderRadius: 24, border: "1px solid rgba(255,255,255,0.09)",
          background: "rgba(10,12,20,0.9)", backdropFilter: "blur(16px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          pointerEvents: "auto",
        }}>
          {([
            { id: "home" as Tab,   Icon: Home,     label: "지도" },
            { id: "search" as Tab, Icon: Search,   label: "검색" },
            { id: "submit" as Tab, Icon: Plus,     label: "제보" },
            { id: "saved" as Tab,  Icon: Bookmark, label: "저장" },
            { id: "course" as Tab, Icon: Route,    label: "코스" },
          ]).map((n) => {
            const isActive = tab === n.id;
            return (
              <button key={n.id} onClick={() => { setTab(n.id); setSelectedId(null); }} style={{
                border: 0, borderRadius: 18, padding: "8px 4px 6px",
                background: isActive ? "#c7ff4d" : "transparent",
                color: isActive ? "#080a0d" : "#4b5563",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3, fontSize: 10,
                fontWeight: isActive ? 700 : 500, transition: "all 150ms",
              }}>
                <n.Icon size={18} />
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
