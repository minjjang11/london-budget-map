"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getBrowserAuthRedirectOrigin } from "@/lib/site/getBrowserAuthRedirectOrigin";

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
                const origin = getBrowserAuthRedirectOrigin();
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: origin ? `${origin}/map` : undefined },
                });
                if (error) {
                  setBusy(false);
                  setMsg(error.message);
                }
              }}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl border-0 bg-budget-primary px-3 py-3 text-[13px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
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
            <p className="text-[11px] font-semibold text-budget-muted">Enter your email for a 6-digit code</p>
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
              placeholder="you@uni.ac.uk"
              autoComplete="email"
              className="budget-input-sm min-w-0 flex-1 text-[13px]"
            />
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                const { error } = await supabase.auth.signInWithOtp({
                  email: email.trim(),
                });
                setBusy(false);
                if (error) {
                  setMsg(error.message);
                  return;
                }
                setCode("");
                setStep("code");
                setMsg("We sent a 6-digit code to your email.");
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
            <p className="text-[11px] font-semibold text-budget-muted">Enter the 6-digit code</p>
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
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setMsg(null);
              }}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="budget-input-sm min-w-0 flex-1 text-center text-[15px] font-extrabold tracking-[0.3em]"
            />
            <button
              type="button"
              disabled={busy || code.trim().length !== 6 || !email.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                const { error } = await supabase.auth.verifyOtp({
                  email: email.trim(),
                  token: code.trim(),
                  type: "email",
                });
                setBusy(false);
                if (error) {
                  setMsg(error.message);
                  return;
                }
                setMsg("Logged in.");
                onSessionChange();
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
              const { error } = await supabase.auth.signInWithOtp({
                email: email.trim(),
              });
              setBusy(false);
              setMsg(error ? error.message : "Sent a fresh 6-digit code.");
            }}
            className="mt-2 cursor-pointer rounded-full border border-budget-surface bg-budget-bg px-3 py-1.5 text-[11px] font-extrabold text-budget-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resend code
          </button>
        </>
      )}
      {msg && <p className="mt-2 text-[11px] font-medium text-budget-text/80">{msg}</p>}
    </div>
  );
}
