import type { PlaceRow } from "./places";

/**
 * Narrow Supabase typings for tables we touch. Add `place_submissions` when that table exists.
 */
export type Database = {
  public: {
    Tables: {
      places: {
        Row: PlaceRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
