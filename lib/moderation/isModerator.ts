/** Server-only: comma-separated list in env (lowercase match). */
export function moderatorEmailSet(): Set<string> {
  const raw = process.env.MODERATOR_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isModeratorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return moderatorEmailSet().has(email.trim().toLowerCase());
}
