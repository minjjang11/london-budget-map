"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/async/withTimeout";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { ensureSupabaseOAuthAuthorizeUrl } from "@/lib/supabase/ensureSupabaseOAuthUrl";
import { signInWithOtpWithOptionalRedirect } from "@/lib/auth/sendSignInOtp";
import { getSupabaseOAuthRedirectTo, NATIVE_OAUTH_REDIRECT } from "@/lib/site/getSupabaseOAuthRedirectTo";

const AUTH_NETWORK_MS = 5000;
/** Email OTP + SMTP can exceed OAuth handshakes — avoid false “network” timeouts. */
const AUTH_OTP_SEND_MS = 22000;
/** Supabase email OTP length (project setting); we accept 6–8 so either template works. */
const OTP_LEN_MIN = 6;

function formatOtpSendError(message: string): string {
  const m = message.trim();
  const low = m.toLowerCase();
  if (low.includes("rate") || low.includes("too many") || low.includes("frequency")) {
    return `${m} Wait a minute before trying again.`;
  }
  if (
    low.includes("redirect") ||
    low.includes("not allowed") ||
    low.includes("invalid url") ||
    low.includes("callback")
  ) {
    return `${m} Add this app’s sign-in URL under Supabase → Authentication → URL configuration → Redirect URLs (e.g. https://your-domain/map or com.mappetite.app://auth/callback), or set NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO to an allowed URL.`;
  }
  /** Exact string from GoTrue when SMTP/default mail fails — almost always project-side email config, not app bug. */
  if (low.includes("magic link") || (low.includes("error sending") && low.includes("email"))) {
    return (
      `${m}\n\n` +
      "Supabase가 인증 메일을 보내기 전에 실패한 상태입니다.\n" +
      "• Dashboard → Authentication → 설정(또는 Project Settings → Auth): Custom SMTP를 쓰면 호스트·포트·비밀번호·발신(From) 주소를 확인하세요. 예전에 잘못된 SMTP를 켠 뒤 끄면 기본 발송이 막히는 경우가 있어, Resend·SendGrid 등으로 다시 맞추는 경우가 많습니다.\n" +
      "• 무료/기본 메일은 수신 주소가 제한되거나 속도 제한이 있을 수 있습니다. 프로젝트가 Paused인지, 스팸함도 확인하세요.\n" +
      "• Redirect URL: Authentication → URL configuration에 https://당신도메인/map (앱과 동일) 이 등록돼 있어야 링크 인증이 됩니다."
    );
  }
  if (low.includes("confirmation") || low.includes("sending") || low.includes("smtp") || low.includes("mail")) {
    return `${m} Check Supabase → Project Settings → Auth: enable a mail provider (or use Supabase default) and confirm email sign-ups aren’t blocked.`;
  }
  return m;
}
const OTP_LEN_MAX = 8;

type Props = {
  session: Session | null;
  onSessionChange: () => void;
  /** Tighter layout for header strip */
  compact?: boolean;
};

export default function AuthPanel({ session, onSessionChange, compact }: Props) {
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [step, setStep] = useState<"choice" | "email" | "code">("choice");

  if (!supabase) return null;

  if (session?.user) {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-budget-surface bg-budget-white/95 px-3 py-2.5 ${compact ? "" : "shadow-sm"}`}
      >
        <p className="min-w-0 text-[12px] font-semibold text-budget-text">
          <span className="text-budget-muted">Signed in</span>{" "}
          <span className="truncate">{session.user.email}</span>
        </p>
        <button
          type="button"
          onClick={async () => {
            setBusy(true);
            await supabase.auth.signOut();
            setBusy(false);
            onSessionChange();
          }}
          disabled={busy}
          className="shrink-0 cursor-pointer rounded-full border border-budget-surface bg-budget-bg px-3 py-1 text-[11px] font-extrabold text-budget-text disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[14px] border border-budget-surface bg-budget-white/95 px-3 py-2.5 ${compact ? "" : "shadow-sm"}`}
    >
      {step === "choice" ? (
        <>
          <p className="mb-2 text-[11px] font-semibold text-budget-muted">Sign in to post and vote</p>
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const redirectTo = await getSupabaseOAuthRedirectTo();
                  if (redirectTo === NATIVE_OAUTH_REDIRECT) {
                    const { data, error } = await withTimeout(
                      supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: {
                          redirectTo: redirectTo || undefined,
                          skipBrowserRedirect: true,
                        },
                      }),
                      AUTH_NETWORK_MS,
                      "Couldn’t start Google sign-in. Check your connection and try again.",
                    );
                    if (error) {
                      setMsg(error.message);
                      return;
                    }
                    if (data.url) {
                      const { openOAuthInAppBrowser } = await import("@/lib/native/oauthInAppBrowser");
                      await openOAuthInAppBrowser(ensureSupabaseOAuthAuthorizeUrl(data.url));
                    }
                    return;
                  }
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: redirectTo || undefined },
                  });
                  if (error) setMsg(error.message);
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-budget-surface bg-white px-3 py-3 text-[13px] font-extrabold text-budget-text shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid size-5 place-items-center rounded-full bg-white" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.56-5.17 3.56-8.66z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.01c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.55.38-2.29V6.6H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4l4.01-3.11z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4.01 3.11c.94-2.84 3.59-4.94 6.72-4.94z"
                    fill="#EA4335"
                  />
                </svg>
              </span>
              {busy ? "Connecting…" : "Continue with Google"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setMsg(null);
              }}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-budget-surface bg-budget-bg px-3 py-3 text-[13px] font-extrabold text-budget-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enter Email
            </button>
          </div>
        </>
      ) : step === "email" ? (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-budget-muted">Enter your email for a sign-in code</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("choice");
                setMsg(null);
              }}
              className="cursor-pointer rounded-full border border-budget-surface bg-budget-bg px-2.5 py-1 text-[10px] font-extrabold text-budget-text"
            >
              Back
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMsg(null);
              }}
              placeholder="example@email.com"
              autoComplete="email"
              className="budget-input-sm min-w-0 flex-1 text-[13px]"
            />
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const result = await withTimeout(
                    signInWithOtpWithOptionalRedirect(supabase, email),
                    AUTH_OTP_SEND_MS,
                    "Couldn’t send the code. Check your connection and try again.",
                  );
                  if (result.error) {
                    setMsg(formatOtpSendError(result.error.message));
                    return;
                  }
                  setCode("");
                  setStep("code");
                  setMsg(`We sent a sign-in code (${OTP_LEN_MIN}–${OTP_LEN_MAX} digits) to your email.`);
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
              className="shrink-0 cursor-pointer rounded-xl border-0 bg-budget-primary px-3 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "…" : "Send code"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-budget-muted">
              Enter the code from your email ({OTP_LEN_MIN}–{OTP_LEN_MAX} digits)
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setCode("");
                setMsg(null);
              }}
              className="cursor-pointer rounded-full border border-budget-surface bg-budget-bg px-2.5 py-1 text-[10px] font-extrabold text-budget-text"
            >
              Back
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LEN_MAX));
                setMsg(null);
              }}
              placeholder="00000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="budget-input-sm min-w-0 flex-1 text-center text-[15px] font-extrabold tracking-[0.22em]"
            />
            <button
              type="button"
              disabled={busy || code.trim().length < OTP_LEN_MIN || !email.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const { error } = await withTimeout(
                    supabase.auth.verifyOtp({
                      email: email.trim(),
                      token: code.trim(),
                      type: "email",
                    }),
                    AUTH_NETWORK_MS,
                    "Sign-in timed out or failed. Check the code and try again.",
                  );
                  if (error) {
                    setMsg(error.message);
                    return;
                  }
                  setMsg("Logged in.");
                  onSessionChange();
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
              className="shrink-0 cursor-pointer rounded-xl border-0 bg-budget-primary px-3 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "…" : "Verify"}
            </button>
          </div>
          <button
            type="button"
            disabled={busy || !email.trim()}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                const result = await withTimeout(
                  signInWithOtpWithOptionalRedirect(supabase, email),
                  AUTH_OTP_SEND_MS,
                  "Couldn’t resend the code. Check your connection and try again.",
                );
                setMsg(result.error ? formatOtpSendError(result.error.message) : "Sent a fresh sign-in code.");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
            className="mt-2 cursor-pointer rounded-full border border-budget-surface bg-budget-bg px-3 py-1.5 text-[11px] font-extrabold text-budget-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resend code
          </button>
        </>
      )}
      {msg && (
        <p className="mt-2 whitespace-pre-line text-[11px] font-medium text-budget-text/80">{msg}</p>
      )}
    </div>
  );
}
