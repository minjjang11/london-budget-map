/**
 * Static `output: 'export'` builds cannot ship Next Route Handlers. Point this at Supabase Edge Functions v1, e.g.
 * `https://YOUR_PROJECT_REF.supabase.co/functions/v1` (see `supabase/functions/*`).
 */
export function moderationRequestUrl(action: "approve" | "reject" | "evaluate-expired" | "me"): string {
  if (action === "evaluate-expired") {
    return "/api/moderation/evaluate-expired";
  }
  const base = (process.env.NEXT_PUBLIC_MODERATION_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (base) {
    const slug =
      action === "approve" ? "approve-submission" : action === "reject" ? "reject-submission" : "moderation-me";
    return `${base}/${slug}`;
  }
  return `/api/moderation/${action}`;
}
