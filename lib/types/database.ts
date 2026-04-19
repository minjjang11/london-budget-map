import type { PlaceInsert, PlaceRow, PlaceSubmissionInsert, PlaceSubmissionRow } from "./places";
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
