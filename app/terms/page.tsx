import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Mappetite",
  description: "Terms governing your use of Mappetite.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[860px] px-4 pb-16 pt-8 text-budget-text">
      <h1 className="text-2xl font-extrabold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-budget-muted">Last updated: 2026-05-07</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-extrabold">User Content Rules</h2>
        <p className="text-sm leading-6">
          Do not post illegal, sexual, hateful, threatening, or advertising/spam content. Do not upload photos or
          reviews that violate others' rights.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-extrabold">Moderation</h2>
        <p className="text-sm leading-6">
          We may review, hide, or remove user submissions, photos, comments, and other content when required for
          policy, legal, or safety reasons.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-extrabold">No Guarantee of Price Accuracy</h2>
        <p className="text-sm leading-6">
          Mappetite uses community-submitted information. Prices and venue details can change and may not always be
          current or accurate.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-extrabold">Support</h2>
        <p className="text-sm leading-6">
          Contact: <a className="underline" href="mailto:contact@mappetite.net">contact@mappetite.net</a>
        </p>
      </section>

      <p className="mt-10 text-sm text-budget-muted">
        See{" "}
        <Link className="underline" href="/privacy">
          Privacy Policy
        </Link>{" "}
        for data handling details.
      </p>
    </main>
  );
}
