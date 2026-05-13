import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const paths = {
  /** Pin source (SVG artboard). */
  lockupSvg: path.join(root, "assets/brand/maimo-pin.source.svg"),
  /** Canonical app icon source (user-provided 1024x1024 PNG). */
  appIconPng: path.join(root, "assets/brand/maimo-app-icon-1024.png"),
  /** Web + in-app splash: transparent pin only (no full-screen mockup). */
  webSplashLogo: path.join(root, "public/brand/maimo-splash-logo-transparent.png"),
  webPin: path.join(root, "public/brand/maimo-pin-native-1024.png"),
  iosSplash1x: path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png"),
  iosSplash2x: path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png"),
  iosSplash3x: path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png"),
  iosIcon1024: path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
  androidSplashLogo: path.join(root, "android/app/src/main/res/drawable/splash_logo.png"),
  androidForeground: path.join(root, "android/app/src/main/res/drawable/ic_launcher_foreground_src.png"),
};

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

/**
 * App icon should be mostly the pin (not the full wordmark).
 * The provided SVG is a large artboard; the pin lives in the upper area.
 * This crop is intentionally conservative and padded to survive Android masks.
 */
async function renderPinIconPng(size) {
  try {
    await fs.access(paths.appIconPng);
    return sharp(paths.appIconPng)
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
  } catch {
    // Fall back to SVG crop when the PNG source is missing.
  }

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

/** Android adaptive icon: keep artwork inside the safe zone (avoid oversized look on launchers). */
async function renderAndroidForegroundPng(size) {
  const inner = Math.round(size * 0.68);
  const icon = await renderPinIconPng(inner);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: icon,
        left: Math.round((size - inner) / 2),
        top: Math.round((size - inner) / 2),
      },
    ])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 9,
    })
    .toBuffer();
}

async function run() {
  const pin1024 = await renderPinIconPng(1024);
  await writePng(pin1024, paths.webPin);
  await writePng(pin1024, paths.webSplashLogo);

  await writePng(pin1024, paths.iosSplash1x);
  await writePng(pin1024, paths.iosSplash2x);
  await writePng(pin1024, paths.iosSplash3x);

  await writePng(pin1024, paths.iosIcon1024);

  await writePng(pin1024, paths.androidSplashLogo);
  await writePng(await renderAndroidForegroundPng(432), paths.androidForeground);

  console.log("Brand assets: transparent pin for splash/web; native splash uses solid colour + centred logo.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
