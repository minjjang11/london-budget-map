import type { SubmissionVoteType } from "./submissionEngagement";

/** Same values as submission votes; kept separate for clarity. */
export type PlaceVoteType = SubmissionVoteType;

export type PlaceVoteRow = {
  id: string;
  place_id: string;
  user_id: string;
  vote_type: PlaceVoteType;
  created_at: string;
  updated_at: string;
};

export type PlaceVoteInsert = {
  place_id: string;
  user_id: string;
  vote_type: PlaceVoteType;
};
