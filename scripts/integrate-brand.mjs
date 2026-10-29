import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
const root = "AB-TRAIN-Logo-Pack/production/";
mkdirSync("public/brand/approved", { recursive: true });
for (const f of [
  "lockups/ab-train-horizontal-dark.webp",
  "lockups/ab-train-horizontal-light.webp",
  "lockups/ab-train-compact-dark.png",
  "lockups/ab-train-compact-light.png",
  "icons/favicon.ico",
  "icons/favicon-16.png",
  "icons/favicon-32.png",
  "icons/apple-touch-icon.png",
  "social/og-image-1200x630.jpg",
])
  copyFileSync(root + f, "public/brand/approved/" + f.split("/").pop());
// Embed the approved raster so downloaded SVG/canvas exports have no external image dependency.
const image = readFileSync(root + "mark/ab-monogram-transparent.webp").toString(
  "base64",
);
writeFileSync(
  "src/brand.js",
  "// Generated from AB-TRAIN-Logo-Pack by scripts/integrate-brand.mjs. Do not redraw.\nexport const brandPaths = " +
    JSON.stringify(
      `<image href="data:image/webp;base64,${image}" width="75" height="45.265" preserveAspectRatio="xMidYMid meet"/>`,
    ) +
    ";\n",
);
