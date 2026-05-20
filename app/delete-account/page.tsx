import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocLayout } from "../components/LegalDocLayout";
import { legalDocPageClassName } from "@/lib/site/legalDocPageClasses";
import { MAIMAO_SUPPORT_EMAIL, maimoSupportMailtoHref } from "@/lib/site/supportContact";

const DELETE_ACCOUNT_MAILTO = `${maimoSupportMailtoHref}?subject=${encodeURIComponent("Delete my Maimo Map account")}`;

export const metadata: Metadata = {
  title: "Delete Your Account — Maimo Map",
  description: "How to request deletion of your Maimo Map account.",
};

export default function DeleteAccountPage() {
  return (
    <LegalDocLayout>
      <div className={legalDocPageClassName}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-budget-primary">Maimo Map</p>
          <Link
            href="/map"
            className="inline-flex items-center rounded-full border border-budget-surface/80 bg-budget-white px-3 py-1.5 text-xs font-bold text-budget-text"
          >
            Back to app
          </Link>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-budget-text">Delete Your Account</h1>

        <div className="mt-8 rounded-2xl border border-budget-surface bg-budget-bg/60 px-5 py-6">
          <p className="text-[15px] leading-relaxed text-budget-text">
            To request account deletion, please email us using the address below. We will process your request within{" "}
            <strong className="font-extrabold">7 days</strong>.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-budget-muted">
            Please send the request from the email address linked to your Maimo Map account so we can verify ownership.
          </p>
          <a
            href={DELETE_ACCOUNT_MAILTO}
            className="mt-6 inline-flex items-center rounded-xl bg-budget-primary px-4 py-3 text-[14px] font-extrabold text-white shadow-[0_6px_16px_rgb(0_168_120_/0.28)] transition active:scale-[0.98]"
          >
            {MAIMAO_SUPPORT_EMAIL}
          </a>
        </div>

        <p className="mt-8 text-sm text-budget-muted">
          Also see{" "}
          <Link className="underline decoration-budget-faint underline-offset-2 hover:text-budget-text" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </LegalDocLayout>
  );
}
