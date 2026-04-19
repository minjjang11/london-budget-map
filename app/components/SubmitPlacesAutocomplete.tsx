"use client";

import { useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

export type SubmitPlacePick = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string | null;
};

type Props = {
  onPick: (p: SubmitPlacePick) => void;
};

/** Standalone Google Places Autocomplete for the Submit tab (no map mount required). */
export default function SubmitPlacesAutocomplete({ onPick }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const googleKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").replace(/\s/g, "");
  if (!googleKey) return null;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "budget-map-submit-places",
    googleMapsApiKey: googleKey,
    libraries: ["places"],
    language: "en",
    region: "GB",
  });

  useEffect(() => {
    if (!isLoaded || loadError || !inputRef.current) return;
    const input = inputRef.current;
    const ac = new google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "geometry", "name", "place_id"],
      componentRestrictions: { country: "gb" },
    });
    acRef.current = ac;
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      const lat = loc.lat();
      const lng = loc.lng();
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const name = (place.name ?? "").trim();
      const address = (place.formatted_address ?? "").trim();
      const placeId = place.place_id ?? null;
      const displayName = name || address.split(",")[0]?.trim() || address;
      const displayAddress = address || name;
      if (!displayName && !displayAddress) return;
      onPickRef.current({
        name: displayName || displayAddress,
        address: displayAddress || displayName,
        lat,
        lng,
        placeId,
      });
    });
    return () => {
      google.maps.event.removeListener(listener);
      acRef.current = null;
    };
  }, [isLoaded, loadError]);

  if (loadError) return null;

  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold text-budget-muted">Find on Google (optional)</label>
      {!isLoaded ? (
        <p className="rounded-[14px] border border-budget-surface bg-budget-surface/40 px-3 py-2.5 text-[12px] text-budget-muted">
          Loading place search…
        </p>
      ) : (
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder="Start typing a venue or London address…"
          className="w-full rounded-[14px] border-2 border-budget-surface bg-budget-white px-3.5 py-3 text-[14px] text-budget-text outline-none focus:border-budget-primary focus:ring-2 focus:ring-budget-primary/25"
        />
      )}
    </div>
  );
}
