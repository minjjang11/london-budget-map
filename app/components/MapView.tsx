"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapSpot = {
  id: string;
  name: string;
  category: "pub" | "restaurant" | "cafe";
  lat: number;
  lng: number;
  lowestPrice: number;
  priceLabel: string;
};

const EMOJI: Record<string, string> = {
  pub: "🍺",
  restaurant: "🍽️",
  cafe: "☕",
};

/** Ref: pubs orange rim, food/coffee soft green */
const PRIMARY = "#00A878";
const BORDER_GREEN = "rgba(0, 168, 120, 0.42)";
const BORDER_ORANGE = "rgba(245, 158, 11, 0.75)";

function categoryBorder(cat: MapSpot["category"], selected: boolean): string {
  const w = selected ? 2 : 1;
  if (cat === "pub") return `${w}px solid ${BORDER_ORANGE}`;
  return `${w}px solid ${BORDER_GREEN}`;
}

function makeIcon(spot: MapSpot, isSelected: boolean) {
  const emoji = EMOJI[spot.category];
  const scale = isSelected ? "scale(1.06)" : "scale(1)";
  const border = categoryBorder(spot.category, isSelected);
  const shadow = isSelected
    ? `0 4px 14px rgba(0, 168, 120, 0.28)`
    : `0 2px 8px rgba(13, 31, 26, 0.07)`;

  const html = `
    <div style="
      display:flex;flex-direction:column;align-items:center;
      cursor:pointer;
      transform: ${scale};
      transition: transform 0.2s ease;
    ">
      <div style="
        background: #ffffff;
        border: ${border};
        border-radius: 999px;
        padding: 3px 8px 3px 7px;
        white-space: nowrap;
        text-align: center;
        box-shadow: ${shadow};
        display: inline-flex;
        align-items: center;
        gap: 4px;
      ">
        <span style="font-size:12px;line-height:1;">${emoji}</span>
        <span style="
          font-size:10px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0D1F1A;
        ">${spot.priceLabel}</span>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "spot-marker",
    iconSize: [76, 30],
    iconAnchor: [38, 15],
  });
}

/** Chelsea / Sloane — matches reference screenshot framing */
const DEFAULT_CENTER: [number, number] = [51.4927, -0.1565];
const DEFAULT_ZOOM = 15;

export default function MapView({
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

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

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
      const icon = makeIcon(spot, isSelected);
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
