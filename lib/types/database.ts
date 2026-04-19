import type { PlaceRow, PlaceSubmissionInsert, PlaceSubmissionRow } from "./places";

/**
 * Narrow Supabase typings for tables we touch.
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
      place_submissions: {
        Row: PlaceSubmissionRow;
        Insert: PlaceSubmissionInsert;
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
