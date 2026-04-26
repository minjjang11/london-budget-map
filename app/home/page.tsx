"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bookmark,
  ChevronRight,
  Coffee,
  Map,
  MapPin,
  MessagesSquare,
  Plus,
  Search,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

const FEATURED = [
  {
    name: "Roti King",
    area: "Euston · basement energy",
    tag: "£2.50 roti",
    tone: "Queue worth it.",
  },
  {
    name: "The Moon Under Water",
    area: "Leicester Square",
    tag: "£2.49 pint",
    tone: "Spoons, but make it central.",
  },
  {
    name: "Dept of Coffee",
    area: "Leather Lane",
    tag: "£2.80 espresso",
    tone: "Shoreditch without the attitude tax.",
  },
  {
    name: "Franco Manca",
    area: "Brixton Market",
    tag: "from £7.50",
    tone: "Sourdough that doesn’t lecture you.",
  },
] as const;

const CATS = [
  { id: "all", label: "All", icon: MapPin },
  { id: "eat", label: "Eat", icon: UtensilsCrossed },
  { id: "drink", label: "Drink", icon: Wine },
  { id: "coffee", label: "Coffee", icon: Coffee },
] as const;

const NAV = [
  { href: "/home", label: "Home", Icon: MapPin },
  { href: "/map", label: "Map", Icon: Map },
  { href: "/map", label: "Buzz", Icon: MessagesSquare },
  { href: "/map", label: "Snitch", Icon: Plus },
  { href: "/map", label: "Saved", Icon: Bookmark },
] as const;

export default function HomePage() {
  const pathname = usePathname();
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [q, setQ] = useState("");

  const subline = useMemo(
    () =>
      [
        "Crowdsourced menu prices.",
        "Zone 1 sanity checks.",
        "Built by skint Londoners, for skint Londoners.",
      ].join(" "),
    [],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-full flex-col bg-ldn-paper pb-28 text-ldn-ink md:h-full md:min-h-0 md:overflow-y-auto">
      <header className="sticky top-0 z-30 border-b border-ldn-line/80 bg-ldn-paper/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 rounded-lg border border-ldn-line bg-white/80 px-3 py-2 text-left text-sm font-semibold tracking-tight shadow-[0_1px_0_rgb(0_0_0_/0.04)] transition hover:border-ldn-ink/20"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ldn-pine text-white">
              <MapPin className="size-4" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 truncate">
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-ldn-ink/45">
                Around
              </span>
              Shoreditch &amp; City
            </span>
          </button>
          <Link
            href="/map"
            className="inline-flex items-center gap-1 rounded-lg border border-ldn-pine/25 bg-ldn-pine px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-[0_1px_0_rgb(0_0_0_/0.12)] transition hover:bg-ldn-pine-mid"
          >
            Map
            <ChevronRight className="size-3.5 opacity-80" strokeWidth={2.5} />
          </Link>
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-ldn-line bg-white px-3 py-2.5 shadow-[0_1px_0_rgb(0_0_0_/0.04)]">
          <Search className="size-4 shrink-0 text-ldn-ink/35" strokeWidth={2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Roti, pint deals, flat whites near you…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ldn-ink placeholder:text-ldn-ink/35 outline-none"
          />
        </label>
      </header>

      <main className="px-4 pt-6">
        <section className="border-b border-ldn-line/70 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ldn-pine">
            Mappetite
          </p>
          <h1 className="mt-2 text-[2.125rem] font-bold leading-[1.08] tracking-[-0.03em]">
            London on a
            <br />
            <span className="text-ldn-pine">lecture-hall</span> budget.
          </h1>
          <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-ldn-ink/70">{subline}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-xl bg-ldn-pine px-4 py-3 text-sm font-bold text-white shadow-[0_1px_0_rgb(0_0_0_/0.15)] transition hover:bg-ldn-pine-mid"
            >
              Open the map
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center rounded-xl border border-ldn-line bg-white px-4 py-3 text-sm font-semibold text-ldn-ink shadow-[0_1px_0_rgb(0_0_0_/0.04)] transition hover:border-ldn-ink/15"
            >
              See what&apos;s cheap tonight
            </Link>
          </div>
          <p className="mt-4 text-xs font-medium italic text-ldn-ink/45">
            &ldquo;Because we&apos;re all broke innit&rdquo; — but make it typography.
          </p>
        </section>

        <section className="py-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Actually cheap right now</h2>
              <p className="mt-1 text-sm text-ldn-ink/55">Real spots. Real prices. No influencer markup.</p>
            </div>
            <Link href="/map" className="shrink-0 text-xs font-bold text-ldn-pine underline decoration-ldn-pine/30 underline-offset-4">
              All picks
            </Link>
          </div>
          <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FEATURED.map((spot) => (
              <article
                key={spot.name}
                className="w-[min(280px,78vw)] shrink-0 snap-start rounded-2xl border border-ldn-line bg-white p-4 shadow-[0_1px_0_rgb(0_0_0_/0.05)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[17px] font-bold leading-snug tracking-tight">{spot.name}</h3>
                  <span className="rounded-md bg-ldn-mist px-2 py-1 text-[11px] font-bold tabular-nums text-ldn-pine">
                    {spot.tag}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ldn-ink/40">{spot.area}</p>
                <p className="mt-3 text-sm leading-snug text-ldn-ink/65">{spot.tone}</p>
                <Link href="/map" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ldn-pine">
                  View on map
                  <ChevronRight className="size-4" strokeWidth={2.5} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="pb-8">
          <h2 className="text-lg font-bold tracking-tight">Live map preview</h2>
          <p className="mt-1 text-sm text-ldn-ink/55">Tap through to drop pins, compare pints, cry responsibly.</p>
          <Link
            href="/map"
            className="mt-4 block overflow-hidden rounded-2xl border border-ldn-line bg-ldn-mist shadow-[0_1px_0_rgb(0_0_0_/0.05)]"
          >
            <div className="relative aspect-[5/3]">
              <div
                className="absolute inset-0 opacity-[0.22]"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 17px, rgb(11 11 12 / 0.06) 17px, rgb(11 11 12 / 0.06) 18px),
                    repeating-linear-gradient(0deg, transparent, transparent 17px, rgb(11 11 12 / 0.06) 17px, rgb(11 11 12 / 0.06) 18px)`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-ldn-pine/25 via-transparent to-ldn-ink/10" />
              <div className="absolute left-1/2 top-[42%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                <span className="rounded-full border-2 border-white bg-ldn-pine px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                  £3.20
                </span>
                <span className="mt-1 h-3 w-px bg-ldn-ink/25" aria-hidden />
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-white/40 bg-white/90 px-4 py-3 backdrop-blur-sm">
                <span className="text-xs font-semibold text-ldn-ink/70">Carto / MapTiler · London</span>
                <span className="text-xs font-bold text-ldn-pine">Enter map →</span>
              </div>
            </div>
          </Link>
        </section>

        <section className="border-t border-ldn-line/70 pb-4 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ldn-ink/40">Browse</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATS.map(({ id, label, icon: Icon }) => {
              const active = cat === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCat(id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold tracking-tight transition ${
                    active
                      ? "border-ldn-pine bg-ldn-pine text-white shadow-[0_1px_0_rgb(0_0_0_/0.12)]"
                      : "border-ldn-line bg-white text-ldn-ink shadow-[0_1px_0_rgb(0_0_0_/0.04)] hover:border-ldn-ink/12"
                  }`}
                >
                  <Icon className="size-4 opacity-90" strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-ldn-ink/35">
            Mind the gap · Mind the pint price
          </p>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ldn-line bg-ldn-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-full justify-between px-1">
          {NAV.map(({ href, label, Icon }) => {
            const isActive =
              (label === "Home" && pathname === "/home") || (label === "Map" && pathname === "/map");
            return (
              <Link
                key={label}
                href={href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                  isActive ? "text-ldn-pine" : "text-ldn-ink/40 hover:text-ldn-ink/70"
                }`}
              >
                <Icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
