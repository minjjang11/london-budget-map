import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const MIN_LEN = 10;
const MAX_LEN = 8000;

export async function insertGeneralContentReport(
  client: SupabaseClient<Database>,
  body: string,
  userId: string | null,
): Promise<{ error: string | null }> {
  const trimmed = body.trim();
  if (trimmed.length < MIN_LEN) {
    return { error: `Please add a bit more detail (at least ${MIN_LEN} characters).` };
  }
  if (trimmed.length > MAX_LEN) {
    return { error: "That report is too long. Please shorten it." };
  }

  const { error } = await client.from("general_content_reports").insert({
    body: trimmed,
    user_id: userId,
  });
  if (error) return { error: error.message };
  return { error: null };
}
