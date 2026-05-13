import Link from "next/link";
import { WebRootRedirect } from "./WebRootRedirect";

/** OAuth/homepage: visible Privacy & Terms on the public root URL. Web redirects to `/map` via `WebRootRedirect`; native uses `layout.tsx` → `/map.html`. */
export default function RootPage() {
  return (
    <>
      <WebRootRedirect />
      <div className="relative flex min-h-dvh flex-col bg-[#FCFFFF] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="w-[min(43.2vw,168px)] shrink-0">
            <img
              src="/brand/maimo-lockup-native-2048.png"
              alt="Maimo Map"
              className="h-auto w-full object-contain select-none"
              style={{ imageRendering: "auto" }}
              draggable={false}
            />
          </div>
          <p className="mt-6 max-w-[28ch] text-[15px] leading-relaxed text-budget-muted">
            Crowdsourced cheap eats, pints &amp; coffee in London.
          </p>
          <Link
            href="/map"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-budget-primary px-8 py-3.5 text-[15px] font-bold text-white shadow-budget-cta transition hover:opacity-95"
          >
            Open map
          </Link>
          <p className="mt-4 text-[13px] text-budget-subtle">
            Or browse the{" "}
            <Link href="/home" className="font-semibold text-budget-text underline underline-offset-4">
              home feed
            </Link>
            .
          </p>
        </div>

        <footer className="shrink-0 pt-6 text-center text-[11px] leading-relaxed text-budget-muted">
          <Link href="/privacy" className="font-semibold text-budget-text underline underline-offset-2">
            Privacy Policy
          </Link>
          <span className="mx-2 text-budget-faint" aria-hidden>
            ·
          </span>
          <Link href="/terms" className="font-semibold text-budget-text underline underline-offset-2">
            Terms of Service
          </Link>
        </footer>
      </div>
    </>
  );
}
