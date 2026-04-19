"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import type { MapSpot } from "./MapView";
import {
  Map,
  MessagesSquare,
  Plus,
  Bookmark,
  Route,
  X,
  Navigation,
  ThumbsUp,
  ThumbsDown,
  LocateFixed,
  Scale,
  ChevronRight,
  ClipboardList,
  Flag,
} from "lucide-react";
import type { Category, Spot, SpotComment, SpotMenuItem } from "@/lib/types/spot";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchApprovedPlaces } from "@/lib/places/fetchApprovedPlaces";
import { insertPlaceSubmission } from "@/lib/places/insertPlaceSubmission";
import { fetchPendingPlaceSubmissions } from "@/lib/places/fetchPendingPlaceSubmissions";
import type { PlaceSubmissionRow } from "@/lib/types/places";
import type { SubmissionVoteType } from "@/lib/types/submissionEngagement";
import {
  fetchSubmissionVoteData,
  removeSubmissionVote,
  upsertSubmissionVote,
} from "@/lib/places/submissionVotes";
import { insertSubmissionReport } from "@/lib/places/submissionReports";
import { checkGooglePlaceDuplicate } from "@/lib/places/checkGooglePlaceDuplicate";
import { rankingNetScore, registeredWithinTrailingDays, RANKING_RULES } from "@/lib/ranking/rankingScores";
import AuthPanel from "./AuthPanel";
import SubmitPlacesAutocomplete from "./SubmitPlacesAutocomplete";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

const HAS_GOOGLE_MAPS_KEY = Boolean((process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").replace(/\s/g, ""));

type Tab = "map" | "community" | "review" | "submit" | "saved" | "course";

type CommunitySort = "price" | "buzz" | "snitches";

type RankingWindow = "weekly" | "alltime";

type PlaceSheetTab = "info" | "buzz";

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

/** No demo venues — spots come only from user submissions. */
const INITIAL_SPOTS: Spot[] = [];

const LS_KEY = "budget-map-spots-v2";
const LS_SAVED = "budget-map-saved-v2";

const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeSpot(raw: Spot): Spot {
  const first = raw.submissions?.[0];
  const fallbackReg =
    raw.registeredAt ||
    (first?.date?.includes("T") ? first.date : first?.date ? `${first.date}T12:00:00.000Z` : undefined) ||
    new Date().toISOString();
  return {
    ...raw,
    submissions: raw.submissions ?? [],
    registeredAt: fallbackReg,
    upvotes: raw.upvotes ?? 0,
    downvotes: raw.downvotes ?? 0,
    comments: Array.isArray(raw.comments) ? raw.comments : [],
    description: raw.description?.trim() || undefined,
  };
}

/** Short text for compact marker preview: DB description, else first review, else default. */
function spotPreviewBlurb(spot: Spot): string {
  const fromDb = spot.description?.trim();
  if (fromDb) return fromDb;
  for (const sub of spot.submissions) {
    if (sub.review?.trim()) return sub.review.trim();
  }
  return "Crowdsourced prices — open full details for the menu breakdown and buzz.";
}

/** New spots stay “on trial” for 7 days for community scrutiny (local UX until backend). */
function trialDaysLeft(registeredAt: string | undefined): number | null {
  if (!registeredAt) return null;
  const start = new Date(registeredAt).getTime();
  if (!Number.isFinite(start)) return null;
  const end = start + TRIAL_MS;
  if (Date.now() >= end) return null;
  return Math.max(1, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
}

function loadSpots(): Spot[] {
  if (typeof window === "undefined") return INITIAL_SPOTS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(INITIAL_SPOTS));
      return INITIAL_SPOTS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(LS_KEY, JSON.stringify(INITIAL_SPOTS));
      return INITIAL_SPOTS;
    }
    return (parsed as Spot[]).map(normalizeSpot);
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(INITIAL_SPOTS));
    return INITIAL_SPOTS;
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

function rankingAddressLine(spot: Spot): string {
  const addr = spot.address?.trim() || "";
  if (!addr) return spot.area?.trim() || "London";
  const compact = addr.replace(/\s+/g, " ");
  return compact.length > 52 ? `${compact.slice(0, 50)}…` : compact;
}

function rankingSocialLine(spot: Spot): string {
  const u = spot.upvotes ?? 0;
  const d = spot.downvotes ?? 0;
  const score = rankingNetScore(u, d);
  if (u === 0 && d === 0) return "No votes yet";
  return `Net ${score} · 👍 ${u} · 👎 ${d}`;
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

function formatSubmittedDisplay(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatReviewTimeRemaining(reviewEndsAt: string): string {
  const end = new Date(reviewEndsAt).getTime();
  if (!Number.isFinite(end)) return "—";
  if (Date.now() >= end) return "Review window ended";
  const ms = end - Date.now();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return `${days}d ${hours}h left`;
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor((ms % 3600000) / 60000));
  return `${mins}m left`;
}

function truncateText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function BudgetMapApp() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("map");
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const [activeArea, setActiveArea] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const [submitName, setSubmitName] = useState("");
  const [submitAddress, setSubmitAddress] = useState("");
  const [submitArea, setSubmitArea] = useState("Soho");
  const [submitCat, setSubmitCat] = useState<Category>("restaurant");
  const [submitItems, setSubmitItems] = useState<SpotMenuItem[]>([{ name: "", price: 0 }]);
  const [submitReview, setSubmitReview] = useState("");
  const [submitLat, setSubmitLat] = useState("");
  const [submitLng, setSubmitLng] = useState("");
  const [submitErrors, setSubmitErrors] = useState<{ name?: string; menu?: string; geo?: string; address?: string }>(
    {},
  );
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitGooglePlaceId, setSubmitGooglePlaceId] = useState<string | null>(null);
  const [submitDuplicateInfo, setSubmitDuplicateInfo] = useState<{
    kind: "approved" | "pending";
    name: string;
  } | null>(null);

  const [pendingRows, setPendingRows] = useState<PlaceSubmissionRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingRefreshTick, setPendingRefreshTick] = useState(0);

  const [session, setSession] = useState<Session | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [approvedPlacesTick, setApprovedPlacesTick] = useState(0);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [voteTallies, setVoteTallies] = useState<Record<string, { up: number; down: number }>>({});
  const [myVotes, setMyVotes] = useState<Record<string, SubmissionVoteType>>({});
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const refreshSession = useCallback(async () => {
    const c = getBrowserSupabase();
    if (!c) {
      setSession(null);
      return;
    }
    const { data } = await c.auth.getSession();
    setSession(data.session ?? null);
  }, []);

  const reloadReviewVotes = useCallback(async () => {
    const c = getBrowserSupabase();
    if (!c || pendingRows.length === 0) return;
    const ids = pendingRows.map((r) => r.id);
    const uid = session?.user?.id ?? null;
    const { tallies, myVote, error } = await fetchSubmissionVoteData(c, ids, uid);
    if (error) {
      console.warn("[budget-map] vote load:", error);
      return;
    }
    const t: Record<string, { up: number; down: number }> = {};
    tallies.forEach((v, k) => {
      t[k] = v;
    });
    const m: Record<string, SubmissionVoteType> = {};
    myVote.forEach((v, k) => {
      m[k] = v;
    });
    setVoteTallies(t);
    setMyVotes(m);
  }, [pendingRows, session?.user?.id]);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [communitySort, setCommunitySort] = useState<CommunitySort>("price");
  const [rankingWindow, setRankingWindow] = useState<RankingWindow>("alltime");
  const [placeSheetTab, setPlaceSheetTab] = useState<PlaceSheetTab>("info");
  const [commentDraft, setCommentDraft] = useState("");
  /** After marker tap: compact preview first; "Full details" opens existing sheet body. */
  const [placeDetailExpanded, setPlaceDetailExpanded] = useState(false);

  const [courseBudget, setCourseBudget] = useState(25);
  const [courseResult, setCourseResult] = useState<Spot[] | null>(null);
  const [remoteApprovedSpots, setRemoteApprovedSpots] = useState<Spot[]>([]);

  const remoteIds = useMemo(
    () => new Set(remoteApprovedSpots.map((s) => s.id)),
    [remoteApprovedSpots],
  );

  const allSpots = useMemo(() => {
    const locals = spots.filter((s) => !remoteIds.has(s.id));
    return [...remoteApprovedSpots, ...locals];
  }, [remoteApprovedSpots, spots, remoteIds]);

  useEffect(() => {
    setMounted(true);
    setSpots(loadSpots());
    setSavedIds(loadSaved());
  }, []);

  useEffect(() => {
    const client = getBrowserSupabase();
    if (!client) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchApprovedPlaces(client);
      if (cancelled) return;
      if (!res.ok) {
        console.warn("[budget-map] Could not load approved places:", res.message);
        return;
      }
      setRemoteApprovedSpots(res.spots);
    })();
    return () => {
      cancelled = true;
    };
  }, [approvedPlacesTick]);
  useEffect(() => {
    saveSpots(spots);
  }, [spots]);
  useEffect(() => {
    saveSavedIds(savedIds);
  }, [savedIds]);

  useEffect(() => {
    if (tab !== "submit") setSubmitSuccess(false);
  }, [tab]);

  useEffect(() => {
    setSubmitDuplicateInfo(null);
  }, [submitGooglePlaceId]);

  useEffect(() => {
    void refreshSession();
    const c = getBrowserSupabase();
    if (!c) return;
    const {
      data: { subscription },
    } = c.auth.onAuthStateChange(() => {
      void refreshSession();
    });
    return () => subscription.unsubscribe();
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.user) {
      setReportTargetId(null);
      setReportText("");
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user?.email) {
      setIsModerator(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/moderation/me", { credentials: "include" });
        const j = (await r.json()) as { moderator?: boolean };
        if (!cancelled) setIsModerator(Boolean(j.moderator));
      } catch {
        if (!cancelled) setIsModerator(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.email]);

  useEffect(() => {
    if (tab !== "review" || !isModerator) return;
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/moderation/evaluate-expired", { method: "POST", credentials: "include" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (cancelled) return;
      if (!r.ok) {
        const msg = typeof j.error === "string" ? j.error : "Moderation job could not run.";
        setToast(msg);
        window.setTimeout(() => setToast(null), 5000);
        return;
      }
      setPendingRefreshTick((n) => n + 1);
      setApprovedPlacesTick((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, isModerator]);

  useEffect(() => {
    if (tab !== "review") {
      setVoteTallies({});
      setMyVotes({});
      return;
    }
    void reloadReviewVotes();
  }, [tab, reloadReviewVotes]);

  useEffect(() => {
    const client = getBrowserSupabase();
    if (!client || tab !== "review") return;
    let cancelled = false;
    setPendingLoading(true);
    setPendingError(null);
    void (async () => {
      const res = await fetchPendingPlaceSubmissions(client);
      if (cancelled) return;
      setPendingLoading(false);
      if (!res.ok) {
        setPendingError(res.message);
        setPendingRows([]);
        return;
      }
      setPendingRows(res.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, pendingRefreshTick]);

  const filtered = useMemo(
    () =>
      allSpots.filter((s) => {
        if (activeCat !== "all" && s.category !== activeCat) return false;
        if (activeArea !== "All" && s.area !== activeArea) return false;
        return true;
      }),
    [allSpots, activeCat, activeArea],
  );

  /** Rankings tab: approved remote places only (same cat/area filters as the map list). */
  const communityApprovedFiltered = useMemo(
    () =>
      remoteApprovedSpots.filter((s) => {
        if (activeCat !== "all" && s.category !== activeCat) return false;
        if (activeArea !== "All" && s.area !== activeArea) return false;
        return true;
      }),
    [remoteApprovedSpots, activeCat, activeArea],
  );

  const ranked = useMemo(() => {
    let pool = [...communityApprovedFiltered];
    if (rankingWindow === "weekly") {
      pool = pool.filter((s) =>
        registeredWithinTrailingDays(s.registeredAt, RANKING_RULES.weeklyRegistrationDays),
      );
    }
    const up = (s: Spot) => s.upvotes ?? 0;
    const down = (s: Spot) => s.downvotes ?? 0;
    if (communitySort === "price") {
      return pool.sort((a, b) => lowestPrice(a) - lowestPrice(b));
    }
    if (communitySort === "buzz") {
      return pool.sort(
        (a, b) =>
          rankingNetScore(up(b), down(b)) - rankingNetScore(up(a), down(a)) ||
          lowestPrice(a) - lowestPrice(b),
      );
    }
    return pool.sort(
      (a, b) =>
        b.submissions.length - a.submissions.length || lowestPrice(a) - lowestPrice(b),
    );
  }, [communityApprovedFiltered, rankingWindow, communitySort]);

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

  const selected = allSpots.find((s) => s.id === selectedId) || null;

  useEffect(() => {
    setPlaceSheetTab("info");
    setCommentDraft("");
    setPlaceDetailExpanded(false);
  }, [selectedId]);

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

  const handleSubmit = async (opts?: { bypassDuplicate?: boolean }) => {
    setSubmitSuccess(false);
    const validItems = submitItems.filter((i) => i.name.trim() && i.price > 0);
    const nextErr: { name?: string; menu?: string; geo?: string; address?: string } = {};
    if (!submitName.trim()) nextErr.name = "Add a venue name.";
    if (validItems.length === 0) nextErr.menu = "Add at least one menu item with a price above £0.";

    const client = getBrowserSupabase();
    if (client) {
      if (!submitAddress.trim()) nextErr.address = "Add a street address (for moderators).";
      const latNum = parseFloat(submitLat);
      const lngNum = parseFloat(submitLng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        nextErr.geo = "Set a pin — use my location or enter latitude and longitude.";
      }
    }

    setSubmitErrors(nextErr);
    if (Object.keys(nextErr).length) return;

    const rep = validItems[0]!;

    if (client) {
      if (!session?.user?.id) {
        setToast("Sign in to submit tips to the shared queue.");
        window.setTimeout(() => setToast(null), 5000);
        return;
      }
      if (opts?.bypassDuplicate) {
        setSubmitDuplicateInfo(null);
      }
      const gid = submitGooglePlaceId?.trim();
      if (gid && !opts?.bypassDuplicate) {
        const dupRes = await checkGooglePlaceDuplicate(client, gid);
        if (!dupRes.ok) {
          setToast(`Couldn’t check for duplicates: ${dupRes.message}`);
          window.setTimeout(() => setToast(null), 5000);
          return;
        }
        if (dupRes.result.hasDuplicate && dupRes.result.kind) {
          setSubmitDuplicateInfo({
            kind: dupRes.result.kind,
            name: dupRes.result.existingName?.trim() || "this venue",
          });
          return;
        }
      }

      const latNum = parseFloat(submitLat);
      const lngNum = parseFloat(submitLng);
      setSubmitBusy(true);
      const { error } = await insertPlaceSubmission(
        client,
        {
          place_name: submitName.trim(),
          address: submitAddress.trim(),
          lat: latNum,
          lng: lngNum,
          category: submitCat,
          menu_item_name: rep.name.trim(),
          price_gbp: rep.price,
          description: submitReview.trim() || null,
          area: submitArea,
          google_place_id: submitGooglePlaceId,
        },
        session.user.id,
      );
      setSubmitBusy(false);
      if (error) {
        setToast(`Couldn’t save your tip: ${error}`);
        window.setTimeout(() => setToast(null), 6000);
        return;
      }
      setSubmitName("");
      setSubmitAddress("");
      setSubmitItems([{ name: "", price: 0 }]);
      setSubmitReview("");
      setSubmitLat("");
      setSubmitLng("");
      setSubmitGooglePlaceId(null);
      setSubmitDuplicateInfo(null);
      setSubmitErrors({});
      setSubmitSuccess(true);
      setPendingRefreshTick((n) => n + 1);
      return;
    }

    const lat = parseFloat(submitLat) || 51.51 + (Math.random() - 0.5) * 0.03;
    const lng = parseFloat(submitLng) || -0.09 + (Math.random() - 0.5) * 0.05;
    const nowIso = new Date().toISOString();
    const newId = `spot_${Date.now()}`;
    const newSpot: Spot = normalizeSpot({
      id: newId,
      name: submitName.trim(),
      category: submitCat,
      area: submitArea,
      lat,
      lng,
      address: submitAddress.trim() || `${submitArea}, London`,
      description: submitReview.trim() || undefined,
      registeredAt: nowIso,
      upvotes: 0,
      comments: [],
      submissions: [
        {
          id: `sub_${Date.now()}`,
          items: validItems,
          review: submitReview.trim() || undefined,
          date: nowIso.split("T")[0]!,
        },
      ],
    });
    setSpots([...spots, newSpot]);
    setSubmitName("");
    setSubmitAddress("");
    setSubmitItems([{ name: "", price: 0 }]);
    setSubmitReview("");
    setSubmitLat("");
    setSubmitLng("");
    setSubmitGooglePlaceId(null);
    setSubmitErrors({});
    setTab("map");
    setSelectedId(newId);
    setFlyTo({ center: [lat, lng], zoom: 16 });
    setToast("Spot added — on trial for 7 days for community review.");
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleVoteOnSubmission = useCallback(
    async (submissionId: string, voteType: SubmissionVoteType) => {
      const c = getBrowserSupabase();
      const uid = session?.user?.id;
      if (!c || !uid) {
        setToast("Sign in to vote — use the email sign-in panel at the top of the Review tab.");
        window.setTimeout(() => setToast(null), 4500);
        return;
      }
      const current = myVotes[submissionId];
      if (current === voteType) {
        const { error } = await removeSubmissionVote(c, submissionId, uid);
        if (error) {
          setToast(error);
          window.setTimeout(() => setToast(null), 5000);
          return;
        }
      } else {
        const { error } = await upsertSubmissionVote(c, submissionId, uid, voteType);
        if (error) {
          setToast(error);
          window.setTimeout(() => setToast(null), 5000);
          return;
        }
      }
      await reloadReviewVotes();
    },
    [session?.user?.id, myVotes, reloadReviewVotes],
  );

  const handleSendReport = useCallback(async () => {
    if (!reportTargetId) return;
    const c = getBrowserSupabase();
    const uid = session?.user?.id;
    if (!c || !uid) {
      setToast("Sign in to report — use the email sign-in panel at the top of the Review tab.");
      window.setTimeout(() => setToast(null), 4500);
      return;
    }
    setReportBusy(true);
    const { error } = await insertSubmissionReport(c, reportTargetId, uid, reportText.trim() || null);
    setReportBusy(false);
    if (error) {
      setToast(error);
      window.setTimeout(() => setToast(null), 5000);
      return;
    }
    setReportTargetId(null);
    setReportText("");
    setToast("Report sent — thanks for helping keep the queue honest.");
    window.setTimeout(() => setToast(null), 4000);
  }, [reportTargetId, reportText, session?.user?.id]);

  const handleReportTap = useCallback(
    (submissionId: string) => {
      if (!session?.user) {
        setToast("Sign in to report — use the email sign-in panel at the top of the Review tab.");
        window.setTimeout(() => setToast(null), 4500);
        return;
      }
      setReportTargetId((id) => (id === submissionId ? null : submissionId));
      setReportText("");
    },
    [session?.user],
  );

  const runModerationEvaluate = useCallback(async () => {
    setModerationBusyId("__eval__");
    try {
      const r = await fetch("/api/moderation/evaluate-expired", { method: "POST", credentials: "include" });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        autoApproved?: number;
        movedToNeedsReview?: number;
        scanned?: number;
      };
      if (!r.ok) {
        setToast(typeof j.error === "string" ? j.error : "Evaluation failed");
        window.setTimeout(() => setToast(null), 5000);
        return;
      }
      setToast(
        (j.scanned ?? 0) > 0
          ? `Rules checked (${j.scanned}): ${j.autoApproved ?? 0} auto-approved, ${j.movedToNeedsReview ?? 0} need moderator.`
          : "No expired submissions were waiting for rules.",
      );
      window.setTimeout(() => setToast(null), 4500);
      setPendingRefreshTick((n) => n + 1);
      setApprovedPlacesTick((n) => n + 1);
    } finally {
      setModerationBusyId(null);
    }
  }, []);

  const moderateApprove = useCallback(async (submissionId: string) => {
    setModerationBusyId(submissionId);
    try {
      const r = await fetch("/api/moderation/approve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setToast(typeof j.error === "string" ? j.error : "Approve failed");
        window.setTimeout(() => setToast(null), 5000);
        return;
      }
      setToast("Approved — this tip is now on the map.");
      window.setTimeout(() => setToast(null), 4000);
      setPendingRefreshTick((n) => n + 1);
      setApprovedPlacesTick((n) => n + 1);
    } finally {
      setModerationBusyId(null);
    }
  }, []);

  const moderateReject = useCallback(async (submissionId: string) => {
    setModerationBusyId(submissionId);
    try {
      const r = await fetch("/api/moderation/reject", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setToast(typeof j.error === "string" ? j.error : "Reject failed");
        window.setTimeout(() => setToast(null), 5000);
        return;
      }
      setToast("Submission rejected and removed from the queue.");
      window.setTimeout(() => setToast(null), 4000);
      setPendingRefreshTick((n) => n + 1);
    } finally {
      setModerationBusyId(null);
    }
  }, []);

  const fillLocationFromDevice = () => {
    if (!navigator.geolocation) {
      setSubmitErrors((e) => ({ ...e, geo: "This browser doesn’t support location." }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSubmitLat(String(pos.coords.latitude.toFixed(5)));
        setSubmitLng(String(pos.coords.longitude.toFixed(5)));
        setLocating(false);
        setSubmitErrors({});
      },
      () => {
        setLocating(false);
        setSubmitErrors((e) => ({ ...e, geo: "Couldn’t read location — allow permission or enter lat/lng." }));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const flyToMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFlyTo({ center: [lat, lng], zoom: 15 });
        setTab("map");
      },
      () => {
        setToast("Location blocked — check browser permissions.");
        window.setTimeout(() => setToast(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const bumpUpvote = (spotId: string) => {
    if (remoteIds.has(spotId)) {
      setToast("Verified spots: shared ratings will need login soon.");
      window.setTimeout(() => setToast(null), 3500);
      return;
    }
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId ? { ...s, upvotes: (s.upvotes ?? 0) + 1 } : s,
      ),
    );
  };

  const addComment = (spotId: string, text: string) => {
    if (remoteIds.has(spotId)) {
      setToast("Verified spots: comments will need login soon.");
      window.setTimeout(() => setToast(null), 3500);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    const c: SpotComment = {
      id: `c_${Date.now()}`,
      text: trimmed,
      date: new Date().toISOString().split("T")[0],
    };
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId ? { ...s, comments: [...(s.comments ?? []), c] } : s,
      ),
    );
    setCommentDraft("");
  };

  const planCourse = () => {
    const by: Record<Category, Spot[]> = { pub: [], restaurant: [], cafe: [] };
    allSpots.forEach((s) => by[s.category].push(s));
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

  const savedSpots = allSpots.filter((s) => savedIds.has(s.id));

  return (
    <div className="budget-app relative mx-auto flex h-dvh min-h-0 w-full max-w-full flex-col overflow-hidden bg-budget-bg font-sans text-budget-text md:h-full">
      {/* Full-bleed map layer */}
      {tab === "map" && mounted && (
        <div className="absolute inset-0 z-0">
          <MapView spots={mapSpots} selectedId={selectedId} onSelect={handleSelect} flyTo={flyTo} />
        </div>
      )}

      <header className="absolute left-2.5 right-2.5 top-2.5 z-50 rounded-[20px] border border-budget-surface/90 bg-budget-white px-3.5 pb-3.5 pt-4 shadow-budget-header">
        <h1 className="mb-3 text-[22px] font-extrabold tracking-[-0.04em] text-budget-text">
          <Link href="/home" className="hover:text-budget-primary/90">
            Budget Map
          </Link>
        </h1>
        <div className="budget-chip-row">{CATS.map((c) => chipCat(c.id as Category | "all", c.label, c.emoji))}</div>
        <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-budget-surface/60 pt-2.5">
          <button
            type="button"
            onClick={flyToMyLocation}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-budget-surface bg-budget-bg px-3 py-1.5 text-[11px] font-bold text-budget-text"
          >
            <LocateFixed size={14} className="text-budget-primary" />
            My location
          </button>
        </div>
      </header>

      {toast && tab === "map" && (
        <div
          role="status"
          className="pointer-events-none absolute left-3 right-3 top-[calc(118px+env(safe-area-inset-top,0px))] z-[55] rounded-2xl border border-budget-primary/25 bg-budget-white/95 px-3.5 py-2.5 text-center text-[13px] font-semibold text-budget-text shadow-budget-float backdrop-blur-sm"
        >
          {toast}
        </div>
      )}

      {tab === "map" && mounted && allSpots.length > 0 && (
        <div
          className="absolute right-3 top-[calc(124px+env(safe-area-inset-top,0px))] z-40 rounded-full border border-budget-surface/90 bg-budget-white/95 px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-budget-text shadow-budget-float backdrop-blur-sm"
          aria-live="polite"
        >
          {mapSpots.length} spot{mapSpots.length === 1 ? "" : "s"}
        </div>
      )}

      {tab === "map" && mounted && allSpots.length === 0 && (
        <div className="absolute left-3 right-3 top-[calc(168px+env(safe-area-inset-top,0px))] z-40 rounded-[18px] border border-budget-surface bg-budget-white/95 px-3.5 py-3 text-[13px] leading-snug text-budget-text shadow-budget-float backdrop-blur-sm">
          <span className="font-extrabold text-budget-primary">No spots yet.</span>{" "}
          Open <strong>Submit</strong> to add a cheap eat, or connect Supabase to show verified spots from the database.
        </div>
      )}

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
                aria-label={placeDetailExpanded ? "Place details" : "Place preview"}
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-3 right-3 rounded-[26px] border border-budget-surface/80 bg-budget-white px-4 pb-4 pt-4 shadow-budget-sheet animate-slide-up ${
                  placeDetailExpanded
                    ? "max-h-[62vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    : "max-h-[min(48vh,420px)] overflow-hidden pb-4"
                }`}
              >
                {!placeDetailExpanded ? (
                  <div className="flex gap-3">
                    <div
                      className="grid size-[48px] shrink-0 place-items-center rounded-2xl bg-budget-surface text-[24px] leading-none shadow-[inset_0_1px_0_rgb(255_255_255_/0.65)]"
                      aria-hidden
                    >
                      {catEmoji(selected.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-budget-primary">
                          {(CATS.find((c) => c.id === selected.category)?.label ?? "Spot").toUpperCase()} ·{" "}
                          {selected.area.toUpperCase()}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          className="grid size-9 shrink-0 place-items-center rounded-full border-0 bg-budget-surface text-budget-text cursor-pointer transition hover:bg-budget-surface/80"
                          aria-label="Close"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <h2 className="mt-1 text-[1.2rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-budget-text">
                        {selected.name}
                      </h2>
                      <div className="mt-2.5">
                        <span className="inline-flex rounded-full bg-budget-primary px-3 py-1.5 text-[13px] font-extrabold text-white shadow-[0_4px_12px_rgb(0_168_120_/0.35)]">
                          from {formatMapPriceLabel(lowestPrice(selected))}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-budget-text/50">{selected.address}</p>
                      <p className="mt-2 line-clamp-4 text-[13px] leading-snug text-budget-text/75">
                        {spotPreviewBlurb(selected)}
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`,
                              "_blank",
                            );
                          }}
                          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-budget-primary py-3 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgb(0_168_120_/0.35)]"
                        >
                          <Navigation size={17} strokeWidth={2.25} />
                          Directions in Google Maps
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlaceDetailExpanded(true)}
                          className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-2xl border-2 border-budget-surface bg-budget-white py-3 text-[13px] font-extrabold text-budget-text"
                        >
                          Full details
                          <ChevronRight size={18} className="text-budget-primary" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center border-b border-budget-surface/60 pb-2.5">
                      <button
                        type="button"
                        onClick={() => setPlaceDetailExpanded(false)}
                        className="cursor-pointer rounded-full border-0 bg-budget-surface px-3 py-1.5 text-[12px] font-extrabold text-budget-text transition hover:bg-budget-surface/80"
                      >
                        ← Summary
                      </button>
                    </div>

                    <div className="flex gap-3.5">
                  <div
                    className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-budget-surface text-[26px] leading-none shadow-[inset_0_1px_0_rgb(255_255_255_/0.65)]"
                    aria-hidden
                  >
                    {catEmoji(selected.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-budget-primary">
                          {(CATS.find((c) => c.id === selected.category)?.label ?? "Spot").toUpperCase()} ·{" "}
                          {selected.area.toUpperCase()}
                        </p>
                        <h2 className="mt-1.5 text-[1.35rem] font-extrabold leading-[1.15] tracking-[-0.035em] text-budget-text">
                          {selected.name}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="grid size-10 shrink-0 place-items-center rounded-full border-0 bg-budget-surface text-budget-text cursor-pointer transition hover:bg-budget-surface/80"
                        aria-label="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-budget-primary px-3.5 py-1.5 text-[14px] font-extrabold text-white shadow-[0_4px_12px_rgb(0_168_120_/0.35)]">
                        from {formatMapPriceLabel(lowestPrice(selected))}
                      </span>
                      <span className="text-[12px] font-semibold text-budget-muted">
                        {selected.submissions.length} report{selected.submissions.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-budget-text/45">{selected.address}</p>
                  </div>
                </div>

                {trialDaysLeft(selected.registeredAt) !== null && (
                  <div className="mt-3 inline-flex w-full items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-2 text-[11px] font-extrabold leading-snug text-amber-950">
                    <Scale size={14} strokeWidth={2.25} aria-hidden className="shrink-0" />
                    On trial · {trialDaysLeft(selected.registeredAt)}d left — verify prices and cheer if it&apos;s legit
                  </div>
                )}

                <div className="mt-4 flex gap-1 rounded-[14px] bg-budget-surface/90 p-1">
                  {(["info", "buzz"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPlaceSheetTab(t)}
                      className={`flex-1 cursor-pointer rounded-[11px] py-2.5 text-center text-[12px] font-extrabold transition ${
                        placeSheetTab === t ? "bg-budget-white text-budget-text shadow-sm" : "text-budget-muted"
                      }`}
                    >
                      {t === "info" ? "Details" : "Buzz"}
                    </button>
                  ))}
                </div>

                {placeSheetTab === "info" && (
                  <div className="mt-4 space-y-3">
                    {selected.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-2xl bg-[#e8f2ed] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/0.5)]"
                      >
                        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-budget-subtle">
                          Report · {sub.date}
                        </div>
                        {sub.items.map((item, ii) => (
                          <div
                            key={ii}
                            className={`flex justify-between gap-3 text-[14px] text-budget-text ${ii > 0 ? "mt-2.5" : "mt-3"}`}
                          >
                            <span className="min-w-0 font-semibold leading-snug">{item.name}</span>
                            <span className="shrink-0 font-extrabold text-budget-primary">
                              {item.price < 3 ? "🔥 " : ""}£{item.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {sub.review && (
                          <div className="mt-3 rounded-xl border-l-[4px] border-budget-primary bg-emerald-50/95 px-3 py-2.5 text-[13px] font-medium leading-snug text-budget-text">
                            <span className="text-budget-primary/80">&ldquo;</span>
                            {sub.review}
                            <span className="text-budget-primary/80">&rdquo;</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {placeSheetTab === "buzz" && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bumpUpvote(selected.id)}
                        className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-budget-surface bg-budget-bg py-3.5 text-[13px] font-extrabold text-budget-text"
                      >
                        <ThumbsUp size={18} className="text-budget-primary" />
                        Rate it ({selected.upvotes ?? 0})
                      </button>
                    </div>
                    <p className="text-[11px] text-budget-subtle">
                      {remoteIds.has(selected.id)
                        ? "Verified listing from the database."
                        : "Stored on this device until we ship a shared backend."}
                    </p>
                    <div className="max-h-[28vh] space-y-2 overflow-y-auto rounded-2xl border border-budget-surface/80 bg-[#e8f2ed] p-2">
                      {(selected.comments ?? []).length === 0 ? (
                        <p className="px-2 py-4 text-center text-[12px] text-budget-muted">No comments yet.</p>
                      ) : (
                        (selected.comments ?? []).map((cm) => (
                          <div
                            key={cm.id}
                            className="rounded-xl border border-white/60 bg-white px-3 py-2.5 text-[13px] text-budget-text shadow-sm"
                          >
                            <div className="text-[10px] font-extrabold uppercase tracking-wide text-budget-subtle">
                              {cm.date}
                            </div>
                            <div className="mt-1">{cm.text}</div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Add a quick note…"
                        className="budget-input-sm min-w-0 flex-1 text-[13px]"
                        maxLength={280}
                      />
                      <button
                        type="button"
                        onClick={() => addComment(selected.id, commentDraft)}
                        className="shrink-0 cursor-pointer rounded-2xl border-0 bg-budget-primary px-4 py-2.5 text-[12px] font-extrabold text-white"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSave(selected.id)}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-budget-surface py-3.5 text-[13px] font-extrabold text-budget-text transition ${
                      savedIds.has(selected.id) ? "bg-budget-surface" : "bg-budget-white"
                    }`}
                  >
                    <Bookmark size={18} strokeWidth={2} className="text-budget-primary" />
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
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-budget-primary py-3.5 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgb(0_168_120_/0.35)]"
                  >
                    <Navigation size={18} strokeWidth={2.25} />
                    Directions
                  </button>
                </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "community" && (
        <div className="budget-tab-panel px-3 pb-3">
          <h2 className="mb-1 text-lg font-extrabold text-budget-text">Rankings</h2>
          <p className="mb-3 text-[12px] leading-snug text-budget-muted">
            Verified map spots only (not device-only tips). Weekly uses spots that first appeared in the last{" "}
            {RANKING_RULES.weeklyRegistrationDays} days; scores use cumulative 👍/👎 until per-week vote history
            exists.
          </p>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-budget-subtle">Window</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(
              [
                { id: "weekly" as const, label: "Weekly" },
                { id: "alltime" as const, label: "All-time" },
              ] as const
            ).map(({ id, label }) => {
              const active = rankingWindow === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRankingWindow(id)}
                  className={`cursor-pointer rounded-full border-0 px-3.5 py-2 text-xs font-semibold ${
                    active ? "bg-budget-primary text-white" : "bg-budget-surface text-budget-text"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-budget-subtle">Sort</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(
              [
                { id: "price" as const, label: "Cheapest" },
                { id: "buzz" as const, label: "Net score" },
                { id: "snitches" as const, label: "Most tips" },
              ] as const
            ).map(({ id, label }) => {
              const active = communitySort === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCommunitySort(id)}
                  className={`cursor-pointer rounded-full border-0 px-3.5 py-2 text-xs font-semibold ${
                    active ? "bg-budget-primary text-white" : "bg-budget-surface text-budget-text"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
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
          <p className="mb-3 text-sm text-budget-muted">Tap a row to open it on the map (same flow as the map tab).</p>
          {remoteApprovedSpots.length === 0 ? (
            <div className="rounded-2xl border border-budget-surface bg-budget-white px-4 py-8 text-center text-[13px] text-budget-muted">
              No approved spots from the server yet — rankings appear after moderation promotes tips to the map.
            </div>
          ) : communityApprovedFiltered.length === 0 ? (
            <div className="rounded-2xl border border-budget-surface bg-budget-white px-4 py-8 text-center text-[13px] text-budget-muted">
              No spots match this category and area. Try <strong>All</strong> filters.
            </div>
          ) : rankingWindow === "weekly" && ranked.length === 0 ? (
            <div className="rounded-2xl border border-budget-surface bg-budget-white px-4 py-8 text-center text-[13px] leading-relaxed text-budget-muted">
              Nothing new on the map in the last {RANKING_RULES.weeklyRegistrationDays} days for these filters.{" "}
              <button
                type="button"
                onClick={() => setRankingWindow("alltime")}
                className="font-extrabold text-budget-primary underline decoration-budget-primary/40 underline-offset-2"
              >
                Switch to All-time
              </button>
            </div>
          ) : (
            ranked.map((spot, i) => {
              const catLabel = CATS.find((c) => c.id === spot.category)?.label ?? "Spot";
              return (
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
                  <div className="min-w-0 flex-1 text-left">
                    <div className="font-bold text-budget-text">{spot.name}</div>
                    <div className="text-[11px] font-semibold text-budget-subtle">
                      {catLabel} · {rankingAddressLine(spot)}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-budget-faint">{rankingSocialLine(spot)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 self-center">
                    <span className="font-extrabold text-budget-primary">{formatMapPriceLabel(lowestPrice(spot))}</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-budget-muted">
                      {rankingWindow === "weekly" ? "Weekly" : "All-time"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {tab === "review" && (
        <div className="budget-tab-panel px-3 pb-3">
          <h2 className="mb-1 text-lg font-extrabold text-budget-text">Review queue</h2>
          <p className="mb-3 text-[12px] leading-snug text-budget-muted">
            Tips waiting for moderation — they stay off the main map until approved. Anyone can browse;{" "}
            <strong className="font-semibold text-budget-text/80">Upvote</strong>,{" "}
            <strong className="font-semibold text-budget-text/80">Downvote</strong>, and{" "}
            <strong className="font-semibold text-budget-text/80">Report</strong> need sign-in.
          </p>

          {isSupabaseConfigured() && getBrowserSupabase() ? (
            <div className="mb-3 space-y-2">
              <AuthPanel session={session} onSessionChange={() => void refreshSession()} compact />
              {!session?.user ? (
                <div
                  role="note"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-snug text-amber-950"
                >
                  <span className="font-extrabold">Signed out</span> — sign in above to use Upvote, Downvote, or Report.
                  If you tap those on a card, we&apos;ll remind you here with a short message. You can still read the
                  queue.
                </div>
              ) : null}
              {isModerator ? (
                <div className="rounded-xl border border-slate-300/80 bg-slate-50 px-3 py-2.5 text-[12px] leading-snug text-slate-900">
                  <p className="font-extrabold text-slate-800">Moderator</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Expired tips are scored automatically when you open this tab (thresholds live in server config, not
                    here). Re-run if you have just changed votes or reports.
                  </p>
                  <button
                    type="button"
                    disabled={moderationBusyId !== null}
                    onClick={() => void runModerationEvaluate()}
                    className="mt-2 w-full cursor-pointer rounded-xl border-2 border-slate-400/50 bg-white py-2 text-[11px] font-extrabold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {moderationBusyId === "__eval__" ? "Running rules…" : "Re-run auto rules"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!isSupabaseConfigured() || !getBrowserSupabase() ? (
            <div className="rounded-2xl border border-budget-surface bg-budget-white px-4 py-8 text-center text-[13px] leading-relaxed text-budget-muted">
              Connect Supabase and run the latest migrations (including the policy that allows reading pending rows) to
              see the shared queue here.
            </div>
          ) : pendingLoading ? (
            <p className="py-12 text-center text-sm text-budget-muted">Loading queue…</p>
          ) : pendingError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-900">
              {pendingError}
            </div>
          ) : pendingRows.length === 0 ? (
            <div className="rounded-2xl border border-budget-surface bg-budget-white px-4 py-10 text-center text-[13px] text-budget-muted">
              Nothing in the queue yet. Open <strong>Submit</strong> to add a cheap eat.
            </div>
          ) : (
            pendingRows.map((row) => {
              const catLabel = CATS.find((c) => c.id === row.category)?.label ?? "Spot";
              const priceNum = Number(row.price_gbp);
              const desc = row.description?.trim();
              return (
                <article
                  key={row.id}
                  className="mb-2.5 rounded-2xl border border-budget-surface bg-budget-white px-4 py-3.5 text-left shadow-[0_2px_8px_rgb(13_31_26_/0.04)]"
                >
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
                        row.status === "needs_review"
                          ? "bg-slate-200 text-slate-900"
                          : "bg-amber-100 text-amber-950"
                      }`}
                    >
                      {row.status === "needs_review" ? "Moderator review" : "Under review"}
                    </span>
                    <span className="text-[11px] font-bold text-budget-primary">
                      {formatReviewTimeRemaining(row.review_ends_at)}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl leading-none" aria-hidden>
                      {catEmoji(row.category)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-budget-primary">
                        {catLabel}
                        {row.area ? ` · ${row.area}` : ""}
                      </p>
                      <h3 className="mt-1 text-base font-extrabold leading-tight tracking-tight text-budget-text">
                        {row.place_name}
                      </h3>
                      <p className="mt-1 text-[12px] font-semibold text-budget-muted">{row.menu_item_name}</p>
                      <p className="mt-0.5 text-[14px] font-extrabold text-budget-primary">
                        {Number.isFinite(priceNum) && priceNum > 0 ? formatMapPriceLabel(priceNum) : "—"}
                      </p>
                      <p className="mt-2 text-[11px] leading-snug text-budget-subtle">{row.address}</p>
                      {desc ? (
                        <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-budget-text/85">
                          {truncateText(desc, 220)}
                        </p>
                      ) : null}
                      <p className="mt-2.5 text-[10px] font-extrabold uppercase tracking-wider text-budget-faint">
                        Submitted {formatSubmittedDisplay(row.submitted_at)}
                      </p>
                    </div>
                  </div>

                  {isSupabaseConfigured() && getBrowserSupabase() ? (
                    <div className="mt-3 border-t border-budget-surface/60 pt-3">
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-budget-faint">
                        Community signal
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleVoteOnSubmission(row.id, "upvote")}
                          className={`inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-2 py-2.5 text-[13px] font-extrabold ${
                            myVotes[row.id] === "upvote"
                              ? "border-budget-primary bg-budget-surface text-budget-text"
                              : "border-budget-surface bg-budget-bg text-budget-text"
                          }`}
                        >
                          <ThumbsUp size={18} className="shrink-0 text-budget-primary" aria-hidden />
                          <span className="min-w-0">Upvote</span>
                          <span className="tabular-nums text-budget-primary">{voteTallies[row.id]?.up ?? 0}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleVoteOnSubmission(row.id, "downvote")}
                          className={`inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-2 py-2.5 text-[13px] font-extrabold ${
                            myVotes[row.id] === "downvote"
                              ? "border-budget-primary bg-budget-surface text-budget-text"
                              : "border-budget-surface bg-budget-bg text-budget-text"
                          }`}
                        >
                          <ThumbsDown size={18} className="shrink-0 text-budget-muted" aria-hidden />
                          <span className="min-w-0">Downvote</span>
                          <span className="tabular-nums text-budget-muted">{voteTallies[row.id]?.down ?? 0}</span>
                        </button>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleReportTap(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-budget-muted underline decoration-budget-faint underline-offset-2 hover:text-budget-text"
                        >
                          <Flag size={12} className="shrink-0 opacity-70" aria-hidden />
                          Report
                        </button>
                      </div>
                      {reportTargetId === row.id ? (
                        <div className="mt-2 space-y-2">
                          <input
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="Optional note for moderators"
                            className="budget-input-sm w-full text-[13px]"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={reportBusy}
                              onClick={() => void handleSendReport()}
                              className="flex-1 cursor-pointer rounded-xl border-0 bg-budget-primary py-2.5 text-[12px] font-extrabold text-white disabled:opacity-50"
                            >
                              {reportBusy ? "Sending…" : "Send report"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReportTargetId(null);
                                setReportText("");
                              }}
                              className="cursor-pointer rounded-xl border-2 border-budget-surface bg-budget-bg px-3 py-2.5 text-[12px] font-extrabold text-budget-text"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {isModerator ? (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-budget-surface/60 pt-3">
                          <button
                            type="button"
                            disabled={moderationBusyId !== null}
                            onClick={() => void moderateApprove(row.id)}
                            className="min-h-[38px] flex-1 cursor-pointer rounded-xl border-0 bg-budget-primary py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Approve (map)
                          </button>
                          <button
                            type="button"
                            disabled={moderationBusyId !== null}
                            onClick={() => void moderateReject(row.id)}
                            className="min-h-[38px] flex-1 cursor-pointer rounded-xl border-2 border-red-300/80 bg-white py-2 text-[11px] font-extrabold text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      )}

      {tab === "submit" && (
        <div className="budget-tab-panel p-4">
          <>
            <h2 className="mb-1.5 text-lg font-extrabold text-budget-text">Grass up a cheap eat</h2>
            <p className="mb-4 text-xs text-budget-text/50">
              {isSupabaseConfigured() ? (
                <>
                  Spill the beans on prices — tips go to a <strong>review queue</strong> and only hit the map after
                  approval. You&apos;ll need a real pin and address so we can verify.
                </>
              ) : (
                <>
                  Spill the beans on prices so the rest of us can survive term time. New spots stay{" "}
                  <strong>on trial for 7 days</strong> so others can sanity-check them (saved on this device).
                </>
              )}
            </p>

            {HAS_GOOGLE_MAPS_KEY ? (
              <SubmitPlacesAutocomplete
                onPick={(p) => {
                  setSubmitName(p.name);
                  setSubmitAddress(p.address);
                  setSubmitLat(String(p.lat.toFixed(6)));
                  setSubmitLng(String(p.lng.toFixed(6)));
                  setSubmitGooglePlaceId(p.placeId);
                  if (submitErrors.geo) setSubmitErrors((er) => ({ ...er, geo: undefined }));
                }}
              />
            ) : null}

            {submitSuccess && (
              <div
                role="status"
                className="mb-4 rounded-[18px] border border-budget-primary/35 bg-[#e8f2ed] px-3.5 py-3 text-[13px] font-semibold leading-snug text-budget-text shadow-sm"
              >
                Thanks — your tip is queued for review (7-day window). It won&apos;t show on the map until a moderator
                approves it.
              </div>
            )}

            {isSupabaseConfigured() && (
              <div className="mb-4">
                <AuthPanel session={session} onSessionChange={() => void refreshSession()} />
              </div>
            )}

            {isSupabaseConfigured() && !session?.user ? (
              <p className="mb-3 rounded-[14px] border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-center text-[12px] font-semibold text-amber-950">
                Sign in with the magic link above to send your tip to the database-backed review queue.
              </p>
            ) : null}

            {(!isSupabaseConfigured() || session?.user) && (
              <>
            <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Venue name</label>
            <input
              value={submitName}
              onChange={(e) => {
                setSubmitName(e.target.value);
                if (submitErrors.name) setSubmitErrors((er) => ({ ...er, name: undefined }));
              }}
              placeholder="e.g. The Royal Oak"
              aria-invalid={!!submitErrors.name}
              className={`mb-1 w-full rounded-[14px] border-2 bg-budget-white px-3.5 py-3 text-[15px] text-budget-text outline-none focus:ring-2 focus:ring-budget-primary/25 ${
                submitErrors.name ? "border-red-400" : "border-budget-primary"
              }`}
            />
            {submitErrors.name && (
              <p className="mb-3 text-[12px] font-semibold text-red-600">{submitErrors.name}</p>
            )}

              <label className="mb-1.5 mt-3 block text-xs font-semibold text-budget-muted">Category</label>
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

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Address</label>
              <input
                value={submitAddress}
                onChange={(e) => {
                  setSubmitAddress(e.target.value);
                  if (submitErrors.address) setSubmitErrors((er) => ({ ...er, address: undefined }));
                }}
                placeholder="e.g. 12 Old Compton St, London W1D 4TB"
                aria-invalid={!!submitErrors.address}
                className={`mb-1 w-full rounded-[14px] border-2 bg-budget-white px-3.5 py-3 text-[14px] text-budget-text outline-none focus:ring-2 focus:ring-budget-primary/25 ${
                  submitErrors.address ? "border-red-400" : "border-budget-surface"
                }`}
              />
              {submitErrors.address && (
                <p className="mb-3 text-[12px] font-semibold text-red-600">{submitErrors.address}</p>
              )}
              <p className="mb-3.5 text-[11px] leading-snug text-budget-muted">
                {isSupabaseConfigured()
                  ? "Required when online queue is enabled — moderators use this to verify the venue."
                  : "Optional offline — defaults to area + London if left blank."}
              </p>

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Menu & prices</label>
              {isSupabaseConfigured() && (
                <p className="mb-1.5 text-[11px] text-budget-muted">
                  The <strong>first</strong> menu row is stored as the representative dish and headline price for review.
                </p>
              )}
              {submitErrors.menu && (
                <p className="mb-2 text-[12px] font-semibold text-red-600">{submitErrors.menu}</p>
              )}
              {submitItems.map((item, idx) => (
                <div key={idx} className="mb-2 flex gap-2">
                  <input
                    value={item.name}
                    placeholder="Item"
                    onChange={(e) => {
                      const n = [...submitItems];
                      n[idx] = { ...n[idx], name: e.target.value };
                      setSubmitItems(n);
                      if (submitErrors.menu) setSubmitErrors((er) => ({ ...er, menu: undefined }));
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
                        if (submitErrors.menu) setSubmitErrors((er) => ({ ...er, menu: undefined }));
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

              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-budget-muted">Pin (optional)</label>
                <button
                  type="button"
                  onClick={fillLocationFromDevice}
                  disabled={locating}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-budget-surface bg-budget-bg px-2.5 py-1 text-[11px] font-bold text-budget-text disabled:opacity-50"
                >
                  <LocateFixed size={12} className="text-budget-primary" />
                  {locating ? "Locating…" : "Use my location"}
                </button>
              </div>
              {submitErrors.geo && (
                <p className="mb-2 text-[12px] font-semibold text-red-600">{submitErrors.geo}</p>
              )}
              <div className="mb-3.5 flex gap-2">
                <input
                  value={submitLat}
                  onChange={(e) => {
                    setSubmitLat(e.target.value);
                    if (submitErrors.geo) setSubmitErrors((er) => ({ ...er, geo: undefined }));
                  }}
                  placeholder="lat"
                  className="budget-input-sm min-w-0 flex-1 text-[13px]"
                />
                <input
                  value={submitLng}
                  onChange={(e) => {
                    setSubmitLng(e.target.value);
                    if (submitErrors.geo) setSubmitErrors((er) => ({ ...er, geo: undefined }));
                  }}
                  placeholder="lng"
                  className="budget-input-sm min-w-0 flex-1 text-[13px]"
                />
              </div>

              <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Description (optional)</label>
              <input
                value={submitReview}
                onChange={(e) => setSubmitReview(e.target.value)}
                placeholder="e.g. queue's long but the roti slaps"
                className="budget-input mb-5 text-sm"
              />

              {submitDuplicateInfo ? (
                <div
                  role="status"
                  className="mb-4 rounded-[14px] border border-amber-300 bg-amber-50 px-3.5 py-3 text-[12px] leading-snug text-amber-950"
                >
                  <p className="font-extrabold">Possible duplicate</p>
                  <p className="mt-1.5">
                    This Google place is already{" "}
                    {submitDuplicateInfo.kind === "approved"
                      ? "on the map as an approved spot"
                      : "in the review queue"}{" "}
                    {submitDuplicateInfo.name ? (
                      <>
                        (<span className="font-semibold">{submitDuplicateInfo.name}</span>).
                      </>
                    ) : (
                      "."
                    )}{" "}
                    You can still send your tip if the menu or price is new.
                  </p>
                  <button
                    type="button"
                    disabled={submitBusy}
                    onClick={() => void handleSubmit({ bypassDuplicate: true })}
                    className="mt-3 w-full cursor-pointer rounded-xl border-2 border-amber-700/40 bg-budget-white py-2.5 text-[12px] font-extrabold text-amber-950 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    Submit anyway
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                disabled={submitBusy}
                onClick={() => void handleSubmit()}
                className="w-full cursor-pointer rounded-2xl border-0 bg-budget-cta py-3.5 text-[15px] font-extrabold text-white shadow-budget-cta transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitBusy ? "Sending…" : "Submit spot"}
              </button>
              </>
            )}
            </>
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
            <p className="mb-2 text-[13px] leading-relaxed text-budget-muted">
              One coffee, one meal, one pint — we search every spot on this map for the cheapest trio under your cap.
            </p>
            <ul className="mb-4 list-disc space-y-1 pl-4 text-[12px] text-budget-subtle">
              <li>Uses <strong>lowest menu price</strong> per venue (from submissions).</li>
              <li>Needs at least one <strong>pub</strong>, one <strong>restaurant</strong>, and one <strong>cafe</strong>.</li>
              <li>Picks the trio with the <strong>smallest total</strong> that still fits under your max spend.</li>
            </ul>
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
            { id: "community" as Tab, label: "Rankings", Icon: MessagesSquare },
            { id: "review" as Tab, label: "Review", Icon: ClipboardList },
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
