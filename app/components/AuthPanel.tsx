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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      <p className="mb-2 text-[11px] font-semibold text-budget-muted">Sign in with email (magic link)</p>
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
            const origin = getBrowserAuthRedirectOrigin();
            const { error } = await supabase.auth.signInWithOtp({
              email: email.trim(),
              options: { emailRedirectTo: origin ? `${origin}/map` : undefined },
            });
            setBusy(false);
            setMsg(error ? error.message : "Check your inbox for the magic link.");
          }}
          className="shrink-0 cursor-pointer rounded-xl border-0 bg-budget-primary px-3 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "…" : "Send link"}
        </button>
      </div>
      {msg && <p className="mt-2 text-[11px] font-medium text-budget-text/80">{msg}</p>}
    </div>
  );
}
