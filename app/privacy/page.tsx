import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocLayout } from "../components/LegalDocLayout";
import { legalDocPageClassName } from "@/lib/site/legalDocPageClasses";
import { MAIMAO_SUPPORT_EMAIL, maimoSupportMailtoHref } from "@/lib/site/supportContact";

export const metadata: Metadata = {
  title: "Privacy Policy — Maimo Map",
  description: "How Maimo Map collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocLayout>
      <div className={legalDocPageClassName}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-budget-primary">Legal</p>
          <Link
            href="/map"
            className="inline-flex items-center rounded-full border border-budget-surface/80 bg-budget-white px-3 py-1.5 text-xs font-bold text-budget-text"
          >
            Back to app
          </Link>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-budget-muted">Last updated: 2026-05-07</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-extrabold">What We Collect</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
            <li>Email address (for sign-in and account access)</li>
            <li>Nickname/profile info if you provide it</li>
            <li>Approximate location data when you request map centering</li>
            <li>Photos you upload with submissions or contributions</li>
            <li>Price submissions and venue details you post</li>
            <li>Reviews/comments and related community reports</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-extrabold">How We Use Data</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
            <li>Provide map/search features and your saved places</li>
            <li>Run community moderation, anti-spam, and abuse review</li>
            <li>Improve data quality and product reliability</li>
            <li>Respond to support, legal, or safety requests</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-extrabold">Community Data & Accuracy</h2>
          <p className="text-sm leading-6">
            Maimo Map is community-driven. Prices, photos, and reviews may change over time and may not always be
            fully accurate.
          </p>
          <p className="text-sm leading-6">
            User-generated content can be reviewed, hidden, or removed if it violates policy, legal requirements, or
            safety rules.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-extrabold">Contact & Deletion Requests</h2>
          <p className="text-sm leading-6">
            Contact:{" "}
            <a className="underline" href={maimoSupportMailtoHref}>
              {MAIMAO_SUPPORT_EMAIL}
            </a>
          </p>
          <p className="text-sm leading-6">
            To request account/data deletion, email us from your sign-in email address with the subject{" "}
            <strong>Delete my Maimo Map data</strong>. We may ask for verification before deleting data.
          </p>
        </section>

        <p className="mt-10 text-sm text-budget-muted">
          Also see{" "}
          <Link className="underline" href="/terms">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </LegalDocLayout>
  );
}
