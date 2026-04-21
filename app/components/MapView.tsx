"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { GoogleMap, OverlayViewF, OVERLAY_MOUSE_TARGET, useJsApiLoader } from "@react-google-maps/api";
import {
  BUDGET_MAP_GOOGLE_LANG,
  BUDGET_MAP_GOOGLE_LIBRARIES,
  BUDGET_MAP_GOOGLE_LOADER_ID,
  BUDGET_MAP_GOOGLE_REGION,
} from "@/lib/googleMapsLoader";

export type MapSpot = {
  id: string;
  name: string;
  category: "pub" | "restaurant" | "cafe";
  lat: number;
  lng: number;
  lowestPrice: number;
  priceLabel: string;
  reviewStatus: "approved" | "under_review";
};

const EMOJI: Record<string, string> = {
  pub: "🍺",
  restaurant: "🍽️",
  cafe: "☕",
};

const MARKER_STATUS = {
  approved: {
    border: "#7EDB93",
    text: "#166534",
    background: "#FFFFFF",
    chip: "#F0FDF4",
    shadow: "rgba(34,197,94,0.2)",
  },
  under_review: {
    border: "#B6BDC8",
    text: "#475467",
    background: "#FFFFFF",
    chip: "#F8FAFC",
    shadow: "rgba(148,163,184,0.22)",
  },
} as const;

/** Review-approved = green outline; under-review = grey outline. */
function makeLeafletIcon(spot: MapSpot, isSelected: boolean) {
  const emoji = EMOJI[spot.category];
  const status = MARKER_STATUS[spot.reviewStatus];
  const scale = isSelected ? "scale(1.08)" : "scale(1)";
  const shadow = isSelected
    ? `0 10px 24px ${status.shadow}, 0 4px 12px rgba(15,23,42,0.18)`
    : `0 5px 14px rgba(15,23,42,0.1), 0 2px 6px ${status.shadow}`;

  const html = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
      transform: ${scale};
      transition: transform 0.2s ease;
    ">
      <div style="
        display:flex;
        align-items:center;
        gap: 6px;
        background: ${status.background};
        border: 2px solid ${status.border};
        border-radius: 999px;
        padding: 5px 10px;
        white-space: nowrap;
        text-align: center;
        box-shadow: ${shadow};
      ">
        <span style="
          width:18px;
          height:18px;
          border-radius:999px;
          background:${status.chip};
          display:grid;
          place-items:center;
          font-size:11px;
          line-height:1;
        ">${emoji}</span>
        <span style="
          font-size:13px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: ${status.text};
          line-height:1;
        ">${spot.priceLabel}</span>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "spot-marker",
    iconSize: [88, 28],
    iconAnchor: [44, 14],
  });
}

const DEFAULT_CENTER: [number, number] = [51.4927, -0.1565];
const DEFAULT_CENTER_LATLNG = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
const DEFAULT_ZOOM = 15;

const MAPTILER_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>';

const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_MAPTILER_MAP = "basic-v2";

/** Hide map-tile POIs where possible; keep transit (stations/lines) visible. */
const GOOGLE_MINIMAL_POI_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", stylers: [{ visibility: "off" }] },
];

/** Raster tiles (Carto/MapTiler) bake labels into PNGs — POIs cannot be toggled off like Google styled maps. */
function addBasemap(map: L.Map) {
  const key = (process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "").trim();
  if (key) {
    const mapId = (process.env.NEXT_PUBLIC_MAPTILER_MAP_ID ?? DEFAULT_MAPTILER_MAP).trim() || DEFAULT_MAPTILER_MAP;
    L.tileLayer(
      `https://api.maptiler.com/maps/${encodeURIComponent(mapId)}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
      {
        attribution: MAPTILER_ATTR,
        maxZoom: 22,
        tileSize: 256,
      },
    ).addTo(map);
    return;
  }

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: CARTO_ATTR,
    maxZoom: 20,
    subdomains: "abcd",
  }).addTo(map);
}

function SpotPill({
  spot,
  selected,
  onSelect,
}: {
  spot: MapSpot;
  selected: boolean;
  onSelect: () => void;
}) {
  const emoji = EMOJI[spot.category];
  const status = MARKER_STATUS[spot.reviewStatus];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="flex cursor-pointer flex-col items-center border-0 bg-transparent p-0 transition-transform"
      style={{
        transform: selected ? "scale(1.08)" : "scale(1)",
        zIndex: selected ? 5 : 1,
      }}
    >
      <div
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-shadow"
        style={{
          padding: "5px 10px",
          border: `2px solid ${status.border}`,
          background: status.background,
          boxShadow: selected
            ? `0 10px 24px ${status.shadow}, 0 4px 12px rgba(15,23,42,0.18)`
            : `0 5px 14px rgba(15,23,42,0.1), 0 2px 6px ${status.shadow}`,
        }}
      >
        <span
          className="grid h-[18px] w-[18px] place-items-center rounded-full text-[11px] leading-none"
          style={{ background: status.chip }}
        >
          {emoji}
        </span>
        <span
          className="text-[13px] font-extrabold tracking-tight"
          style={{ color: status.text }}
        >
          {spot.priceLabel}
        </span>
      </div>
    </button>
  );
}

function MapViewLeaflet({
  spots,
  selectedId,
  onSelect,
  flyTo,
}: {
  spots: MapSpot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  flyTo?: { center: [number, number]; zoom: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const lastFlyRef = useRef<string>("");

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    /** No default zoom stack — avoids overlap with app bottom nav + FAB (pinch / double-tap still zooms). */
    addBasemap(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    spots.forEach((spot) => {
      if (!isFinite(spot.lat) || !isFinite(spot.lng)) return;
      const isSelected = spot.id === selectedId;
      const icon = makeLeafletIcon(spot, isSelected);
      const marker = L.marker([spot.lat, spot.lng], { icon }).addTo(map);
      marker.on("click", () => onSelectRef.current(spot.id));
      markersRef.current.push(marker);
    });
  }, [spots, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    const { center, zoom } = flyTo;
    if (!isFinite(center[0]) || !isFinite(center[1])) return;
    const key = `${center[0]},${center[1]},${zoom}`;
    if (key === lastFlyRef.current) return;
    lastFlyRef.current = key;
    map.flyTo(center, zoom, { duration: 0.55 });
  }, [flyTo]);

  return (
    <div
      className="map-fill"
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    />
  );
}

function MapViewGoogle({
  spots,
  selectedId,
  onSelect,
  flyTo,
  apiKey,
}: {
  spots: MapSpot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  flyTo?: { center: [number, number]; zoom: number } | null;
  apiKey: string;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastFlyRef = useRef<string>("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const { isLoaded, loadError } = useJsApiLoader({
    id: BUDGET_MAP_GOOGLE_LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: BUDGET_MAP_GOOGLE_LIBRARIES,
    language: BUDGET_MAP_GOOGLE_LANG,
    region: BUDGET_MAP_GOOGLE_REGION,
  });

  const mapOptions = useMemo((): google.maps.MapOptions => {
    return {
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      rotateControl: false,
      scaleControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
      styles: GOOGLE_MINIMAL_POI_STYLES,
    };
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    const { center, zoom } = flyTo;
    if (!isFinite(center[0]) || !isFinite(center[1])) return;
    const key = `${center[0]},${center[1]},${zoom}`;
    if (key === lastFlyRef.current) return;
    lastFlyRef.current = key;
    map.panTo({ lat: center[0], lng: center[1] });
    map.setZoom(zoom);
  }, [flyTo]);

  if (loadError) {
    return (
      <div
        className="map-fill flex flex-col items-center justify-center gap-2 bg-[#e8eaed] p-6 text-center text-sm text-red-900"
        style={{ position: "absolute", inset: 0 }}
      >
        <p className="font-semibold">Google Maps could not load.</p>
        <p className="max-w-[280px] text-xs leading-relaxed text-red-950/80">
          Google Cloud: enable <strong>Maps JavaScript API</strong>, link billing, and confirm the key. Vercel: set{" "}
          <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> for{" "}
          <strong>Production</strong>, then <strong>Redeploy</strong>. Open DevTools → Console for the exact error.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="map-fill flex items-center justify-center bg-[#e8eaed] text-sm text-[#0D1F1A]"
        style={{ position: "absolute", inset: 0 }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className="map-fill" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        mapContainerClassName="google-map-root"
        center={DEFAULT_CENTER_LATLNG}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={mapOptions}
      >
        {spots.map((spot) => {
          if (!isFinite(spot.lat) || !isFinite(spot.lng)) return null;
          const selected = spot.id === selectedId;
          return (
            <OverlayViewF
              key={spot.id}
              position={{ lat: spot.lat, lng: spot.lng }}
              mapPaneName={OVERLAY_MOUSE_TARGET}
              zIndex={selected ? 1000 : 100}
              getPixelPositionOffset={(w, h) => ({
                x: -(w / 2),
                y: -h,
              })}
            >
              <SpotPill spot={spot} selected={selected} onSelect={() => onSelectRef.current(spot.id)} />
            </OverlayViewF>
          );
        })}
      </GoogleMap>
    </div>
  );
}

/** Google Maps when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; otherwise Leaflet + MapTiler/Carto. */
export default function MapView(props: {
  spots: MapSpot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  flyTo?: { center: [number, number]; zoom: number } | null;
}) {
  /* Strip all whitespace — Vercel paste often inserts accidental spaces inside the key */
  const googleKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").replace(/\s/g, "");
  if (googleKey) {
    return <MapViewGoogle {...props} apiKey={googleKey} />;
  }
  return <MapViewLeaflet {...props} />;
}
