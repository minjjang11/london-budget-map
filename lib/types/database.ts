import type { PlaceInsert, PlaceRow, PlaceSubmissionInsert, PlaceSubmissionRow } from "./places";
import type { PlaceContributionInsert, PlaceContributionRow } from "./placeContributions";
import type { PlaceReviewTagInsert, PlaceReviewTagRow } from "./placeReviewTag";
import type { SavedPlaceInsert, SavedPlaceRow } from "./savedPlaces";
import type { PlaceVoteInsert, PlaceVoteRow } from "./placeEngagement";
import type {
  SubmissionReportInsert,
  SubmissionReportRow,
  SubmissionVoteInsert,
  SubmissionVoteRow,
} from "./submissionEngagement";

/**
 * Narrow Supabase typings for tables we touch.
 */
export type Database = {
  public: {
    Tables: {
      places: {
        Row: PlaceRow;
        Insert: PlaceInsert;
        Update: never;
        Relationships: [];
      };
      place_votes: {
        Row: PlaceVoteRow;
        Insert: PlaceVoteInsert;
        Update: Partial<Pick<PlaceVoteInsert, "vote_type">>;
        Relationships: [];
      };
      saved_places: {
        Row: SavedPlaceRow;
        Insert: SavedPlaceInsert;
        Update: never;
        Relationships: [];
      };
      place_review_tags: {
        Row: PlaceReviewTagRow;
        Insert: PlaceReviewTagInsert;
        Update: never;
        Relationships: [];
      };
      place_contributions: {
        Row: PlaceContributionRow;
        Insert: PlaceContributionInsert;
        Update: never;
        Relationships: [];
      };
      place_submissions: {
        Row: PlaceSubmissionRow;
        Insert: PlaceSubmissionInsert;
        Update: Partial<Pick<PlaceSubmissionRow, "status">>;
        Relationships: [];
      };
      submission_votes: {
        Row: SubmissionVoteRow;
        Insert: SubmissionVoteInsert;
        Update: Partial<Pick<SubmissionVoteInsert, "vote_type">>;
        Relationships: [];
      };
      submission_reports: {
        Row: SubmissionReportRow;
        Insert: SubmissionReportInsert;
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
