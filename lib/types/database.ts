import type { PlaceRow, PlaceSubmissionInsert, PlaceSubmissionRow } from "./places";
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
    Functions: {
      pending_submission_report_counts: {
        Args: { p_ids: string[] };
        Returns: { submission_id: string; report_count: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
