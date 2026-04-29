import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const paths = {
  pinSvg: path.join(root, "assets/brand/mappetite-pin.source.svg"),
  wordmarkPng: path.join(root, "public/brand/mappetite-wordmark.png"),
  webPin: path.join(root, "public/brand/mappetite-pin-native-1024.png"),
  webLockup: path.join(root, "public/brand/mappetite-lockup-native-2048.png"),
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

async function renderPin(size) {
  const svg = await fs.readFile(paths.pinSvg);
  return sharp(svg)
    .png()
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
}

async function makeIconSquare(size, outPath) {
  // Keep generous safety padding for Android/iOS masks.
  const inner = Math.round(size * 0.68);
  const pin = await renderPin(inner);
  const top = Math.round((size - inner) / 2);
  const left = top;
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: pin, left, top }]);
  await ensureParent(outPath);
  await canvas.png({ compressionLevel: 9 }).toFile(outPath);
}

async function makeLockupSquare(size, outPath) {
  const pinHeight = Math.round(size * 0.44);
  const wordmarkWidth = Math.round(size * 0.62);
  const gap = Math.round(size * 0.045);

  const pin = await renderPin(pinHeight);
  const wordmark = await sharp(paths.wordmarkPng)
    .resize(wordmarkWidth, Math.round(size * 0.16), {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const pinMeta = await sharp(pin).metadata();
  const wordMeta = await sharp(wordmark).metadata();
  const contentHeight = (pinMeta.height ?? 0) + gap + (wordMeta.height ?? 0);
  const y = Math.round((size - contentHeight) / 2);
  const pinX = Math.round((size - (pinMeta.width ?? 0)) / 2);
  const wordX = Math.round((size - (wordMeta.width ?? 0)) / 2);

  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([
    { input: pin, left: pinX, top: y },
    { input: wordmark, left: wordX, top: y + (pinMeta.height ?? 0) + gap },
  ]);
  await ensureParent(outPath);
  await canvas.png({ compressionLevel: 9 }).toFile(outPath);
}

async function run() {
  await makeIconSquare(1024, paths.webPin);
  await makeLockupSquare(2048, paths.webLockup);

  // Native splash/icon assets are PNG derivatives from the SVG source.
  await makeLockupSquare(2732, paths.iosSplash1x);
  await makeLockupSquare(2732, paths.iosSplash2x);
  await makeLockupSquare(2732, paths.iosSplash3x);
  await makeIconSquare(1024, paths.iosIcon1024);
  await makeLockupSquare(2732, paths.androidSplash);
  await makeIconSquare(432, paths.androidForeground);

  console.log("Brand assets generated.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
