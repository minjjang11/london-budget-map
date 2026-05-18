import type { SupabaseClient } from "@supabase/supabase-js";
import { isIosUserAgent } from "@/lib/auth/detectInAppBrowser";
import {
  consumeAuthTokensFromUrl,
  isOAuthCodeReuseError,
} from "@/lib/supabase/consumeAuthCallbackUrl";

export const OAUTH_STATUS_LOADING = "Completing sign-in…";
/** Shown only when a mobile browser tab must bounce to the native app scheme. */
export const OAUTH_STATUS_HANDOFF = "Completing sign-in…";
export const OAUTH_STATUS_ERROR = "Sign-in could not be completed. Please try again.";

export type FinishOAuthCallbackResult =
  | { ok: true }
  | { ok: false; error: string | null };

function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "production") return;
  console.log("[auth:oauth-callback]", ...args);
}

function redactAuthUrl(rawUrl: string): string {
  return rawUrl
    .replace(/code=[^&#]+/gi, "code=[redacted]")
    .replace(/access_token=[^&#]+/gi, "access_token=[redacted]")
    .replace(/refresh_token=[^&#]+/gi, "refresh_token=[redacted]");
}

function sessionWaitBudgetMs(): number {
  return isIosUserAgent() ? 10_000 : 5_000;
}

/** Poll until Supabase session is visible (exchange can lag behind getSession, especially on iOS). */
export async function waitForAuthSession(
  client: SupabaseClient,
  maxMs = sessionWaitBudgetMs(),
  stepMs = 200,
): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const { data, error } = await client.auth.getSession();
    if (error) devLog("getSession error:", error.message);
    if (data.session) {
      devLog("session exists: true");
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  devLog("session exists: false (timed out)");
  return false;
}

/** Resolves when auth state reports a session (faster than polling alone on Safari). */
export function waitForAuthSessionViaSubscription(
  client: SupabaseClient,
  maxMs = sessionWaitBudgetMs(),
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub?.subscription.unsubscribe();
      resolve(ok);
    };

    void client.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (session) finish(true);
    });

    const timer = setTimeout(() => finish(false), maxMs);
  });
}

export async function ensureAuthSessionReady(client: SupabaseClient): Promise<boolean> {
  if (await waitForAuthSession(client, sessionWaitBudgetMs())) return true;
  return waitForAuthSessionViaSubscription(client, sessionWaitBudgetMs());
}

/**
 * Exchanges OAuth callback params, then confirms session before reporting failure.
 * Safe when the deep link fires twice or the code was already exchanged in the app WebView.
 */
export async function finishOAuthCallback(
  client: SupabaseClient,
  rawUrl: string,
): Promise<FinishOAuthCallbackResult> {
  devLog("callback received:", redactAuthUrl(rawUrl));

  const hasCodeOrToken = /[?&#](code|access_token)=/.test(rawUrl);
  if (!hasCodeOrToken) {
    const hasSession = await waitForAuthSession(client, 1500);
    return hasSession ? { ok: true } : { ok: false, error: null };
  }

  devLog("exchangeCodeForSession started");
  const { ok, error } = await consumeAuthTokensFromUrl(client, rawUrl);

  if (ok) {
    devLog("exchangeCodeForSession succeeded");
    const confirmed = await ensureAuthSessionReady(client);
    return confirmed ? { ok: true } : { ok: false, error: null };
  }

  devLog("exchangeCodeForSession failed:", error ?? "(no error param)");

  if (await waitForAuthSession(client)) {
    devLog("session present after failed exchange — treating as success");
    return { ok: true };
  }

  if (error && isOAuthCodeReuseError(error)) {
    devLog("code reuse — waiting for session from app WebView");
    if (await waitForAuthSession(client, 3000, 250)) {
      return { ok: true };
    }
  }

  return { ok: false, error };
}
