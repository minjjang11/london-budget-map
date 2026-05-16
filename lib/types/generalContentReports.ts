export type GeneralContentReportRow = {
  id: string;
  body: string;
  user_id: string | null;
  created_at: string;
};

export type GeneralContentReportInsert = {
  body: string;
  user_id?: string | null;
};
