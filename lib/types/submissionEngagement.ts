export type SubmissionVoteType = "upvote" | "downvote";

export type SubmissionVoteRow = {
  id: string;
  submission_id: string;
  user_id: string;
  vote_type: SubmissionVoteType;
  created_at: string;
};

export type SubmissionVoteInsert = {
  submission_id: string;
  user_id: string;
  vote_type: SubmissionVoteType;
};

export type SubmissionReportRow = {
  id: string;
  submission_id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
};

export type SubmissionReportInsert = {
  submission_id: string;
  user_id: string;
  reason?: string | null;
};
