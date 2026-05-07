import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Mappetite",
  description: "Terms governing your use of Mappetite.",
};

export default function TermsPage() {
  return (
    <main className="h-dvh w-full overflow-y-auto bg-budget-bg text-budget-text">
      <div className="mx-auto w-full max-w-[860px] px-4 pb-16 pt-6">
        <section className="rounded-[24px] border border-budget-surface/80 bg-budget-white px-5 py-5 shadow-budget-header">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-budget-primary">Legal</p>
            <Link
              href="/map"
              className="inline-flex items-center rounded-full border border-budget-surface bg-budget-bg px-3 py-1.5 text-xs font-bold text-budget-text"
            >
              Back to app
            </Link>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-budget-muted">Last updated: 2026-05-07</p>

          <section className="mt-8 space-y-3">
            <h2 className="text-lg font-extrabold">User Content Rules</h2>
            <p className="text-sm leading-6">
              Do not post illegal, sexual, hateful, threatening, or advertising/spam content. Do not upload photos or
              reviews that violate others&apos; rights.
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
              Contact:{" "}
              <a className="underline" href="mailto:contact@mappetite.net">
                contact@mappetite.net
              </a>
            </p>
          </section>

          <p className="mt-10 text-sm text-budget-muted">
            See{" "}
            <Link className="underline" href="/privacy">
              Privacy Policy
            </Link>{" "}
            for data handling details.
          </p>
        </section>
      </div>
    </main>
  );
}
