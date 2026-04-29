import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const paths = {
  /** Full brand lockup exported from design (pin + wordmark + gradients). */
  lockupSvg: path.join(root, "assets/brand/mappetite-pin.source.svg"),
  webLockup: path.join(root, "public/brand/mappetite-lockup-native-2048.png"),
  webPin: path.join(root, "public/brand/mappetite-pin-native-1024.png"),
  iosSplash1x: path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png"),
  iosSplash2x: path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png"),
  iosSplash3x: path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png"),
  iosIcon1024: path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
  androidSplash: path.join(root, "android/app/src/main/res/drawable/splash.png"),
  androidForeground: path.join(root, "android/app/src/main/res/drawable/ic_launcher_foreground.png"),
};

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function renderLockupPng(size) {
  const svg = await fs.readFile(paths.lockupSvg);
  return sharp(svg)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 9,
    })
    .toBuffer();
}

/**
 * App icon should be mostly the pin (not the full wordmark).
 * The provided SVG is a large artboard; the pin lives in the upper area.
 * This crop is intentionally conservative and padded to survive Android masks.
 */
async function renderPinIconPng(size) {
  const svg = await fs.readFile(paths.lockupSvg);
  const hi = 4096;
  const raster = await sharp(svg)
    .resize(hi, hi, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  // Crop to pin region in the hi-res raster (based on the Group 40.svg layout).
  const extracted = await sharp(raster)
    .extract({
      left: Math.round(hi * 0.22),
      top: Math.round(hi * 0.02),
      width: Math.round(hi * 0.56),
      height: Math.round(hi * 0.62),
    })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 9,
    })
    .toBuffer();

  return extracted;
}

async function writePng(buf, outPath) {
  await ensureParent(outPath);
  await sharp(buf).png({ compressionLevel: 9 }).toFile(outPath);
}

async function run() {
  await writePng(await renderLockupPng(2048), paths.webLockup);
  await writePng(await renderPinIconPng(1024), paths.webPin);

  await writePng(await renderLockupPng(2732), paths.iosSplash1x);
  await writePng(await renderLockupPng(2732), paths.iosSplash2x);
  await writePng(await renderLockupPng(2732), paths.iosSplash3x);

  await writePng(await renderPinIconPng(1024), paths.iosIcon1024);

  await writePng(await renderLockupPng(2732), paths.androidSplash);
  await writePng(await renderPinIconPng(432), paths.androidForeground);

  console.log("Brand assets generated from lockup SVG.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
