/** Bump when replacing files under `public/brand/` so browsers & CDNs fetch fresh assets. */
export const BRAND_ASSET_VERSION = "20260509";

export function brandImg(src: `/brand/${string}`): string {
  return `${src}?v=${BRAND_ASSET_VERSION}`;
}
