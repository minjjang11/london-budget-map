import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const paths = {
  /** Map pin only: no wordmark, no canvas rect, transparent background (splash + icons). */
  pinIconOnlySvg: path.join(root, "assets/brand/maimo-pin-icon-only.source.svg"),
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
 * Renders the map pin from the pin-only SVG (true alpha — no baked canvas).
 * Do not use `maimo-app-icon-1024.png` here: common exports include an opaque light square.
 */
async function renderPinIconPng(size) {
  const svg = await fs.readFile(paths.pinIconOnlySvg);
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

async function writePng(buf, outPath) {
  await ensureParent(outPath);
  await sharp(buf).png({ compressionLevel: 9 }).toFile(outPath);
}

/**
 * iOS app icon — match Galaxy adaptive launcher: white background + same pin scale/inset.
 * Mirrors @drawable/ic_launcher (white bg + ic_launcher_foreground 20dp inset on 108dp).
 */
async function renderIosIconPng(size) {
  const inset = Math.round(size * (20 / 108));
  const foregroundSize = size - 2 * inset;
  const foreground = await renderAndroidForegroundPng(foregroundSize);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: foreground,
        left: inset,
        top: inset,
      },
    ])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 9,
    })
    .toBuffer();
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

  await writePng(await renderIosIconPng(1024), paths.iosIcon1024);

  await writePng(pin1024, paths.androidSplashLogo);
  await writePng(await renderAndroidForegroundPng(432), paths.androidForeground);

  console.log("Brand assets: transparent pin for splash/web; native splash uses solid colour + centred logo.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
