import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEmailRedirectTo } from "@/lib/site/getSupabaseOAuthRedirectTo";

/**
 * `signInWithOtp` with redirect URL, then without if Supabase rejects the URL.
 */
export async function signInWithOtpWithOptionalRedirect(
  supabase: SupabaseClient,
  email: string,
): Promise<{ error: AuthError | null }> {
  const trimmed = email.trim();
  const emailRedirectTo = await getSupabaseEmailRedirectTo();

  const first = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: true,
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (!first.error) {
    return { error: null };
  }

  const msg = first.error.message;
  if (
    emailRedirectTo &&
    /redirect|not allowed|invalid\s*url|callback\s*url|site\s*url/i.test(msg)
  ) {
    const second = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    return { error: second.error };
  }

  return { error: first.error };
}
