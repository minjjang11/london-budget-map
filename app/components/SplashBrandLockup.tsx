import { brandImg } from "@/lib/site/brandAssets";

/**
 * Brand lockup for splash / web shell: pin SVG + wordmark SVG only.
 * Wordmark paths are the canonical `txt.svg` asset (outlined type — no webfont).
 */
export function SplashBrandLockup() {
  return (
    <div className="flex origin-center scale-[0.355] flex-col items-center">
      <img
        src={brandImg("/brand/maimo-splash-pin.svg")}
        alt=""
        className="w-[min(40vw,184px)] max-h-[34vh] object-contain select-none"
        draggable={false}
      />
      <img
        src={brandImg("/brand/maimo-splash-wordmark.svg")}
        alt="Maimo Map"
        className="mt-10 w-[min(88vw,420px)] max-w-[94vw] object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
