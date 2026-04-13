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

const COLORS: Record<string, string> = {
  pub: "#E67E22",
  restaurant: "#E74C6F",
  cafe: "#8B5CF6",
};

const BG_COLORS: Record<string, string> = {
  pub: "#FFF7ED",
  restaurant: "#FFF1F3",
  cafe: "#F5F0FF",
};

function makeIcon(spot: MapSpot, isSelected: boolean) {
  const color = COLORS[spot.category];
  const bg = BG_COLORS[spot.category];
  const emoji = EMOJI[spot.category];
  const scale = isSelected ? "scale(1.15)" : "scale(1)";
  const shadow = isSelected
    ? `0 6px 24px ${color}55, 0 2px 8px rgba(0,0,0,0.15)`
    : `0 3px 12px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)`;

  const html = `
    <div style="
      display:flex;flex-direction:column;align-items:center;
      cursor:pointer;
      transform: ${scale};
      transition: transform 0.2s ease;
    ">
      <div style="
        background: ${isSelected ? color : bg};
        border: 2.5px solid ${color};
        border-radius: 16px;
        padding: 6px 11px;
        white-space: nowrap;
        text-align: center;
        box-shadow: ${shadow};
        position: relative;
      ">
        <div style="font-size:15px;line-height:1.1;">${emoji}</div>
        <div style="
          font-size:10.5px;
          font-weight:800;
          letter-spacing:-0.02em;
          color: ${isSelected ? "#fff" : color};
          margin-top:2px;
        ">
          ${spot.priceLabel}
        </div>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 8px solid ${isSelected ? color : bg};
        margin-top: -1px;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "spot-marker",
    iconSize: [80, 65],
    iconAnchor: [40, 65],
  });
}

/** 한반도 전체가 보이도록 */
const DEFAULT_CENTER: [number, number] = [36.45, 127.95];
const DEFAULT_ZOOM = 7;

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
      attribution: '&copy; <a href="https://www.openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
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
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [flyTo]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
