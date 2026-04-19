import type { Libraries } from "@react-google-maps/api";

/**
 * Single loader identity + libraries for every `useJsApiLoader` in the app.
 * Mismatched ids or libraries between Map and Submit caused script conflicts when switching tabs.
 */
export const BUDGET_MAP_GOOGLE_LOADER_ID = "budget-map-google-maps";

export const BUDGET_MAP_GOOGLE_LIBRARIES: Libraries = ["places"];

export const BUDGET_MAP_GOOGLE_LANG = "en";

export const BUDGET_MAP_GOOGLE_REGION = "GB";
