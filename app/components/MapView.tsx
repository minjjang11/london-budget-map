"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { GoogleMap, OverlayViewF, OVERLAY_MOUSE_TARGET, useJsApiLoader } from "@react-google-maps/api";

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

const PRIMARY = "#00A878";
const BORDER_GREEN = "rgba(0, 168, 120, 0.42)";
const BORDER_ORANGE = "rgba(245, 158, 11, 0.75)";

function categoryBorder(cat: MapSpot["category"], selected: boolean): string {
  const w = selected ? 2 : 1;
  if (cat === "pub") return `${w}px solid ${BORDER_ORANGE}`;
  return `${w}px solid ${BORDER_GREEN}`;
}

/** Chelsea / Sloane */
const DEFAULT_CENTER = { lat: 51.4927, lng: -0.1565 };
const DEFAULT_ZOOM = 15;

const mapContainerStyle = { width: "100%", height: "100%" };

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
  const border = categoryBorder(spot.category, selected);
  const shadow = selected
    ? `0 4px 14px rgba(0, 168, 120, 0.28)`
    : `0 2px 8px rgba(13, 31, 26, 0.07)`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        border: "none",
        padding: 0,
        background: "none",
        transform: selected ? "scale(1.06)" : "scale(1)",
        transition: "transform 0.2s ease",
        zIndex: selected ? 5 : 1,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border,
          borderRadius: 999,
          padding: "3px 8px 3px 7px",
          whiteSpace: "nowrap",
          boxShadow: shadow,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 12, lineHeight: 1 }}>{emoji}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#0D1F1A",
          }}
        >
          {spot.priceLabel}
        </span>
      </div>
    </button>
  );
}

function MissingApiKey() {
  return (
    <div
      className="map-fill"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#e8eaed",
        textAlign: "center",
        color: "#0D1F1A",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      <div>
        <p style={{ fontWeight: 800, marginBottom: 8 }}>Google Maps API 키가 필요해요</p>
        <p style={{ opacity: 0.75, marginBottom: 12 }}>
          프로젝트 루트에 <code style={{ fontSize: 13 }}>.env.local</code> 파일을 만들고 아래를 넣은 뒤 개발 서버를 다시 켜 주세요.
        </p>
        <code
          style={{
            display: "block",
            fontSize: 12,
            padding: "10px 12px",
            background: "#fff",
            borderRadius: 10,
            textAlign: "left",
            wordBreak: "break-all",
          }}
        >
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=여기에_키
        </code>
        <p style={{ marginTop: 14, fontSize: 12, opacity: 0.6 }}>
          Google Cloud Console → Maps JavaScript API 활성화 → API 키 발급 (HTTP 리퍼러 제한 권장)
        </p>
      </div>
    </div>
  );
}

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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  if (!apiKey) {
    return <MissingApiKey />;
  }

  return <MapViewLoaded spots={spots} selectedId={selectedId} onSelect={onSelect} flyTo={flyTo} apiKey={apiKey} />;
}

function MapViewLoaded({
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
    id: "budget-map-google-script",
    googleMapsApiKey: apiKey,
    language: "en",
    region: "GB",
  });

  const mapOptions = useMemo((): google.maps.MapOptions => {
    const zoomPos =
      typeof google !== "undefined"
        ? google.maps.ControlPosition.RIGHT_BOTTOM
        : (9 as google.maps.ControlPosition);
    return {
      disableDefaultUI: false,
      zoomControl: true,
      zoomControlOptions: { position: zoomPos },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    };
  }, [isLoaded]);

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
        className="map-fill"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#fdecea",
          color: "#7f1d1d",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        지도를 불러오지 못했어요. API 키·결제·Maps JavaScript API 활성화를 확인해 주세요.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="map-fill"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e8eaed",
          color: "#0D1F1A",
          fontSize: 14,
        }}
      >
        지도 불러오는 중…
      </div>
    );
  }

  return (
    <div className="map-fill" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        mapContainerClassName="google-map-root"
        center={DEFAULT_CENTER}
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
