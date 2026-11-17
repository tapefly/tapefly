import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "..");
const assets = path.join(here, "assets");
const screenshots = path.join(here, "screenshots");

await mkdir(assets, { recursive: true });
await mkdir(screenshots, { recursive: true });

const character = path.join(project, "public/promo-v2/characters/tapefly-momo-v1.png");
const poster = path.join(project, "public/promo-v2/exports/tapefly-promo-v6-poster.jpg");
const buildShot = path.join(project, "public/promo-v2/gameplay-v4/build.png");
const chipShot = path.join(project, "public/promo-v2/gameplay-v4/chip.png");

const palette = {
  ink: "#061518",
  cream: "#fff4d8",
  orange: "#f1b64b",
  mint: "#79efbd",
  fog: "#a7c7c2",
};

function esc(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function wordmark(width, size, x, y, anchor = "start") {
  const flySize = size * 1.02;
  return `
    <text x="${x}" y="${y}" text-anchor="${anchor}"
      font-family="Avenir Next Condensed, Arial Narrow, sans-serif"
      font-size="${size}" font-weight="900" letter-spacing="${-size * 0.045}"
      fill="${palette.cream}">TAPE<tspan font-size="${flySize}" fill="${palette.orange}">FLY</tspan></text>
  `;
}

function horizontalOverlay(width, height, titleSize, subtitleSize) {
  const x = Math.round(width * 0.06);
  const baseline = Math.round(height * 0.48);
  const ruleY = Math.round(baseline + titleSize * 0.42);
  const subY = Math.round(ruleY + subtitleSize * 1.65);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#031013" stop-opacity=".97"/>
          <stop offset=".48" stop-color="#06191d" stop-opacity=".88"/>
          <stop offset=".78" stop-color="#06191d" stop-opacity=".18"/>
          <stop offset="1" stop-color="#06191d" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" stop-color="#031013" stop-opacity="0"/>
          <stop offset="1" stop-color="#031013" stop-opacity=".8"/>
        </linearGradient>
        <pattern id="grid" width="${Math.max(28, Math.round(width / 28))}" height="${Math.max(28, Math.round(width / 28))}" patternUnits="userSpaceOnUse">
          <path d="M ${width / 28} 0 H 0 V ${width / 28}" fill="none" stroke="${palette.mint}" stroke-opacity=".045" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#shade)"/>
      <rect width="${width}" height="${height}" fill="url(#bottom)"/>
      <rect width="${width}" height="${height}" fill="url(#grid)"/>
      <g opacity=".22" fill="none" stroke="${palette.mint}" stroke-width="${Math.max(1.5, width / 800)}">
        <path d="M ${width * 0.56} ${height * 0.1} H ${width * 0.89} V ${height * 0.28} H ${width * 0.72}"/>
        <circle cx="${width * 0.56}" cy="${height * 0.1}" r="${Math.max(2, width / 380)}"/>
        <circle cx="${width * 0.72}" cy="${height * 0.28}" r="${Math.max(2, width / 380)}"/>
      </g>
      ${wordmark(width, titleSize, x, baseline)}
      <rect x="${x}" y="${ruleY}" width="${Math.round(width * 0.16)}" height="${Math.max(3, Math.round(titleSize * 0.035))}" fill="${palette.orange}"/>
      <text x="${x}" y="${subY}"
        font-family="Avenir Next, Helvetica Neue, sans-serif"
        font-size="${subtitleSize}" font-weight="700" letter-spacing="${subtitleSize * 0.11}"
        fill="${palette.fog}">BUILD A MIND · LET IT LIVE</text>
    </svg>
  `);
}

function verticalOverlay(width, height, titleSize, subtitleSize, libraryHero = false) {
  const x = Math.round(width * 0.075);
  const titleY = libraryHero ? Math.round(height * 0.46) : Math.round(height * 0.18);
  const subtitleY = titleY + titleSize * 0.78;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2=".45">
          <stop offset="0" stop-color="#031013" stop-opacity=".96"/>
          <stop offset=".48" stop-color="#06191d" stop-opacity=".78"/>
          <stop offset=".82" stop-color="#06191d" stop-opacity=".08"/>
          <stop offset="1" stop-color="#06191d" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".45" stop-color="#031013" stop-opacity="0"/>
          <stop offset="1" stop-color="#031013" stop-opacity=".84"/>
        </linearGradient>
        <pattern id="grid" width="${Math.max(26, Math.round(width / 16))}" height="${Math.max(26, Math.round(width / 16))}" patternUnits="userSpaceOnUse">
          <path d="M ${width / 16} 0 H 0 V ${width / 16}" fill="none" stroke="${palette.mint}" stroke-opacity=".045" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#shade)"/>
      <rect width="${width}" height="${height}" fill="url(#bottom)"/>
      <rect width="${width}" height="${height}" fill="url(#grid)"/>
      ${wordmark(width, titleSize, x, titleY)}
      <rect x="${x}" y="${subtitleY}" width="${Math.round(width * 0.18)}" height="${Math.max(3, Math.round(titleSize * 0.035))}" fill="${palette.orange}"/>
      <text x="${x}" y="${subtitleY + subtitleSize * 1.8}"
        font-family="Avenir Next, Helvetica Neue, sans-serif"
        font-size="${subtitleSize}" font-weight="700" letter-spacing="${subtitleSize * 0.09}"
        fill="${palette.fog}">BUILD A MIND · LET IT LIVE</text>
    </svg>
  `);
}

async function base(w, h, { blur = 0, brightness = 0.9 } = {}) {
  let image = sharp(character)
    .resize(w, h, { fit: "cover", position: "centre" })
    .modulate({ brightness, saturation: 1.08 });
  if (blur) image = image.blur(blur);
  return image.png().toBuffer();
}

async function capsule(name, width, height, titleSize, subtitleSize, orientation = "horizontal") {
  const overlay =
    orientation === "horizontal"
      ? horizontalOverlay(width, height, titleSize, subtitleSize)
      : verticalOverlay(width, height, titleSize, subtitleSize, name === "library-hero");
  await sharp(await base(width, height))
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, name));
}

await capsule("header-capsule.png", 920, 430, 92, 15);
await capsule("small-capsule.png", 462, 174, 55, 9);
await capsule("main-capsule.png", 1232, 706, 126, 19);
await capsule("vertical-capsule.png", 748, 896, 94, 14, "vertical");
await capsule("library-capsule.png", 600, 900, 80, 12, "vertical");
await capsule("library-hero.png", 3840, 1240, 310, 34, "vertical");

await sharp(await base(1920, 1080, { brightness: 0.9 }))
  .composite([{ input: horizontalOverlay(1920, 1080, 188, 24), left: 0, top: 0 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(assets, "endcard-1920x1080.png"));

await sharp(poster)
  .resize(1438, 810, { fit: "cover" })
  .modulate({ brightness: 0.66, saturation: 0.82 })
  .blur(3)
  .composite([
    {
      input: Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1438" height="810">
          <rect width="1438" height="810" fill="#031013" fill-opacity=".58"/>
          <rect x="0" y="0" width="1438" height="810" fill="url(#g)"/>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#071d20" stop-opacity=".2"/>
              <stop offset="1" stop-color="#031013" stop-opacity=".82"/>
            </linearGradient>
          </defs>
        </svg>
      `),
      left: 0,
      top: 0,
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(assets, "page-background.png"));

await sharp(
  Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <filter id="glow" x="-30%" y="-60%" width="160%" height="240%">
          <feGaussianBlur stdDeviation="18" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      ${wordmark(1280, 258, 640, 390, "middle")}
      <rect x="515" y="438" width="250" height="9" fill="${palette.orange}" filter="url(#glow)"/>
    </svg>
  `),
)
  .png({ compressionLevel: 9 })
  .toFile(path.join(assets, "library-logo.png"));

async function icon(size, filename, labelSize) {
  const art = await base(size, size, { brightness: 0.92 });
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".35" stop-color="#031013" stop-opacity="0"/>
          <stop offset="1" stop-color="#031013" stop-opacity=".92"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#d)"/>
      <text x="${size / 2}" y="${size * 0.87}" text-anchor="middle"
        font-family="Avenir Next Condensed, Arial Narrow, sans-serif"
        font-size="${labelSize}" font-weight="900" letter-spacing="${-labelSize * 0.04}"
        fill="${palette.cream}">TAPE<tspan fill="${palette.orange}">FLY</tspan></text>
    </svg>
  `);
  await sharp(art)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, filename));
}

await icon(256, "shortcut-icon.png", 54);
await icon(184, "app-icon.png", 39);
await sharp(path.join(assets, "app-icon.png"))
  .flatten({ background: palette.ink })
  .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
  .toFile(path.join(assets, "app-icon.jpg"));

await copyFile(buildShot, path.join(screenshots, "01-build-the-body.png"));
await copyFile(chipShot, path.join(screenshots, "03-inspect-the-logic.png"));

await writeFile(
  path.join(here, "asset-manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Capsules and icons are deterministic composites built from the TapeFly character source. Replace screenshots/extracted frames only with verified in-game captures.",
      assets: {
        headerCapsule: "assets/header-capsule.png (920x430)",
        smallCapsule: "assets/small-capsule.png (462x174)",
        mainCapsule: "assets/main-capsule.png (1232x706)",
        verticalCapsule: "assets/vertical-capsule.png (748x896)",
        pageBackground: "assets/page-background.png (1438x810)",
        libraryCapsule: "assets/library-capsule.png (600x900)",
        libraryHero: "assets/library-hero.png (3840x1240)",
        libraryLogo: "assets/library-logo.png (1280x720, transparent)",
        shortcutIcon: "assets/shortcut-icon.png (256x256)",
        appIcon: "assets/app-icon.jpg (184x184)",
        trailerEndcard: "assets/endcard-1920x1080.png (1920x1080)",
      },
    },
    null,
    2,
  ) + "\n",
);

console.log(`Steam assets written to ${assets}`);
