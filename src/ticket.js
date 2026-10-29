import {
  displayDate,
  t,
  getLanguage,
  locale,
  displayDuration,
} from "./i18n.js";
import { brandPaths } from "./brand.js";
import QRCode from "qrcode";
import { CLASSES, qrData, duration } from "./booking.js";
import { getStation, displayLocationName } from "./locations.js";
export const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const purple = "#6424ce";
let renderSequence = 0;
const text = (x, y, s, size = 24, extra = "") => {
  if (/[\u0600-\u06ff]/u.test(s) && !extra.includes("direction=")) {
    // Keep geometric anchors stable while shaping Arabic in its natural direction.
    if (extra.includes('text-anchor="end"'))
      extra = extra.replace('text-anchor="end"', 'text-anchor="start"');
    else if (!extra.includes("text-anchor=")) extra += ' text-anchor="end"';
    extra += ' direction="rtl" unicode-bidi="plaintext"';
  }
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(s)}</text>`;
};
// Measure with the actual export font, rather than estimating from character counts.
function fitted(
  x,
  y,
  value,
  width,
  size = 30,
  weight = 600,
  color = "#111116",
) {
  let font = size;
  if (typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${weight} ${font}px Arial`;
    const measured = ctx.measureText(value).width;
    font = Math.min(font, (font * width) / Math.max(1, measured));
  }
  return text(x, y, value, font, `font-weight="${weight}" fill="${color}"`);
}
function wrapped(x, y, value, width, size = 32, lineHeight = 42) {
  if (typeof document === "undefined") return fitted(x, y, value, width, size);
  const ctx = document.createElement("canvas").getContext("2d");
  let lines = [];
  do {
    ctx.font = `600 ${size}px Arial`;
    lines = [];
    let current = "";
    for (const word of value.split(/\s+/u)) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = "";
      for (const { segment } of new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      }).segment(word)) {
        if (current && ctx.measureText(current + segment).width > width) {
          lines.push(current);
          current = segment;
        } else current += segment;
      }
    }
    if (current) lines.push(current);
    if (lines.length <= 5) break;
    size -= 1;
  } while (size > 12);
  lineHeight = size * 1.3;
  return lines
    .map((s, i) =>
      text(
        /[\u0600-\u06ff]/u.test(value) ? x + width : x,
        y + i * lineHeight,
        s.trim(),
        size,
        `font-weight="600" ${/[\u0600-\u06ff]/u.test(value) ? 'direction="rtl" text-anchor="start" unicode-bidi="plaintext"' : ""}`,
      ),
    )
    .join("");
}
const glyphs = {
  train:
    '<rect x="3" y="0" width="28" height="30" rx="5"/><path d="M3 10h28M3 22h28M9 30l-5 8m21-8 5 8"/><circle cx="10" cy="26" r="1"/><circle cx="24" cy="26" r="1"/>',
  seat: '<path d="M6 1q-4 0-3 5l4 20q1 5 7 5h15q7 0 7-7H15L12 5q0-4-6-4ZM5 42h29M13 31v11m14-11v11"/>',
  person:
    '<circle cx="17" cy="9" r="8"/><path d="M2 38v-5a15 15 0 0 1 30 0v5"/>',
  price: '<path d="M1 23 22 2h13v13L14 36Z"/><circle cx="28" cy="9" r="3"/>',
  star: '<path d="m18 0 6 13 14 2-10 10 2 15-12-7-13 7 3-15L-2 15l14-2Z"/>',
  ticket:
    '<rect x="2" y="0" width="30" height="40" rx="3"/><path d="M12 15V9a5 5 0 0 1 10 0v6ZM10 24h15M10 31h15"/>',
  reference: '<path d="m13 0-7 40M29 0l-7 40M1 13h35M0 27h35"/>',
  calendar:
    '<rect x="1" y="5" width="34" height="33" rx="4"/><path d="M9 0v11M27 0v11M1 16h34M9 24h1m8 0h1m8 0h1M9 31h1m8 0h1"/>',
  clock: '<circle cx="18" cy="20" r="18"/><path d="M18 8v13l9 5"/>',
  shield:
    '<path d="m18 0 17 7v14q-2 13-17 21Q3 34 1 21V7Z"/><path d="m10 20 6 6 11-13"/>',
};
const icon = (x, y, kind, scale = 1) =>
  `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${purple}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${glyphs[kind]}</g>`;
export function ticketSVG(b, language = getLanguage()) {
  const tt = (key, params = {}) => t(key, params, language);
  // Preview and print coexist in one document. SVG resource IDs must be unique.
  const resourceId = `ab-ticket-${++renderSequence}`;
  const matrix = QRCode.create(qrData(b), {
    errorCorrectionLevel: "M",
  }).modules;
  const total = matrix.size + 8,
    cell = 390 / total,
    x = 220,
    y = 795;
  let path = "";
  for (let row = 0; row < matrix.size; row++)
    for (let col = 0; col < matrix.size; col++)
      if (matrix.get(row, col))
        path += `M${x + (col + 4) * cell} ${y + (row + 4) * cell}h${cell}v${cell}h-${cell}Z`;
  const field = (fx, fy, label, value, width = 180, size = 38) =>
    `${fitted(fx, fy, label, width, 21, 400, "#323238")}${fitted(fx, fy + 52, String(value), width, size)}`;
  const date = new Intl.DateTimeFormat(locale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(b.date));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1500" width="1000" height="1500" font-family="Arial, sans-serif" role="img" aria-label="${escape(t("Sample AB TRAIN ticket for {name}", { name: b.passenger }, language))}" lang="${language}">
  <defs><linearGradient id="${resourceId}-purple" x2="1" y2="1"><stop stop-color="#341278"/><stop offset="1" stop-color="${purple}"/></linearGradient><clipPath id="${resourceId}-edge"><rect x="1" y="1" width="998" height="1498" rx="40"/></clipPath></defs>
  <g clip-path="url(#${resourceId}-edge)">
  <rect width="1000" height="1500" fill="#fff"/>
  <rect width="1000" height="230" fill="#09090b"/><path d="M0 0h160L32 230H0Z" fill="url(#${resourceId}-purple)"/>
  <g transform="translate(325 48) scale(3)">${brandPaths}</g>
  <path d="M591 54v124" stroke="#d0d0d4"/>
  ${text(650, 118, "AB", 61, `font-weight="700" fill="${purple}" letter-spacing="3"`)}${text(650, 166, "TRAIN", 35, 'fill="#fff" letter-spacing="12"')}
  <rect y="230" width="150" height="1190" fill="#09090b"/><path d="M0 1350 150 1080v340H0Z" fill="url(#${resourceId}-purple)"/>
  <rect x="35" y="285" width="80" height="118" rx="19" fill="none" stroke="${purple}" stroke-width="4"/>${icon(53, 307, "train", 1.4)}
  <g transform="translate(86 1180) rotate(-90)">${text(0, 0, tt("TICKET N°"), 22, 'fill="#fff" letter-spacing="2"')}${text(165, 0, b.ticketId, 28, `fill="#ab7aff" font-weight="600"`)}</g>
  <rect x="180" y="252" width="790" height="43" rx="5" fill="#eee5fd"/>${text(575, 280, tt("SAMPLE — NOT VALID FOR TRAVEL"), 22, `fill="${purple}" font-weight="700" text-anchor="middle"`)}
  <path d="M675 320v888M190 490h450M190 667h450M405 328v125M405 520v120" stroke="#dedbe3" stroke-width="1.4"/>
  ${icon(208, 344, "seat", 1.15)}${field(270, 351, tt("Seat"), String(b.seat).padStart(2, "0"), 120, 48)}
  ${icon(449, 339, "train", 1.15)}${field(505, 351, tt("Train"), b.service.number, 139, 43)}
  ${icon(208, 548, "train", 1.15)}${field(270, 555, tt("Coach"), String(b.coach).padStart(2, "0"), 120, 48)}
  ${icon(449, 548, "price", 1.15)}${field(505, 555, tt("Demo fare"), b.price, 139, 48)}${text(505, 648, "MAD", 24, `fill="${purple}" font-weight="600"`)}
  ${icon(208, 701, "star", 1.15)}${field(270, 714, tt("Travel class"), tt(CLASSES[b.travelClass].name), 370, 34)}
  <rect x="220" y="795" width="390" height="390" fill="#fff"/><path d="${path}" fill="#000" shape-rendering="crispEdges"/>
  ${icon(215, 1178, "shield", 0.7)}${text(252, 1200, tt("Scan for demo booking data"), 20, `fill="${purple}"`)}
  ${icon(710, 329, "person")}${text(762, 354, tt("Passenger"), 21)}${wrapped(710, 409, b.passenger, 260, 30)}
  ${icon(710, 564, "ticket")}${text(762, 590, tt("Ticket number"), 21)}${fitted(710, 635, b.ticketId, 260, 23)}
  ${icon(710, 705, "reference")}${text(762, 730, tt("Booking reference"), 21)}${fitted(710, 775, b.reference, 260, 23)}
  ${icon(710, 846, "calendar")}${text(762, 872, tt("Travel date"), 21)}${fitted(710, 917, date, 260, 30)}
  ${icon(710, 989, "clock")}${text(762, 1015, tt("Departure"), 21)}${text(710, 1060, b.service.departure, 34, 'font-weight="600"')}
  ${text(710, 1121, tt(b.status), 23, `fill="${purple}" font-weight="600"`)}
  ${text(710, 1159, tt("Created · Casablanca time"), 17, 'fill="#55515e"')}${fitted(710, 1190, new Intl.DateTimeFormat(locale(language), { timeZone: "Africa/Casablanca", dateStyle: "short", timeStyle: "short" }).format(new Date(b.createdAt)), 260, 21)}
  <rect x="162" y="1233" width="821" height="170" rx="14" fill="#fff" stroke="#dedbe3"/>
  ${text(188, 1269, tt("From"), 19)}${fitted(188, 1307, displayLocationName(getStation(b.service.from), language), 280, 27)}${text(188, 1378, b.service.departure, 37, `fill="${purple}" font-weight="600"`)}
  <path d="M490 1328h184m-13-10 13 10-13 10" fill="none" stroke="${purple}" stroke-width="3"/><circle cx="490" cy="1328" r="8" fill="${purple}"/>
  <rect x="520" y="1301" width="125" height="54" rx="12" fill="#fff" stroke="#111" stroke-width="2"/>${text(582, 1338, b.service.number, 30, 'text-anchor="middle" font-weight="600"')}${text(582, 1287, tt("SIMULATED"), 13, 'text-anchor="middle" fill="#55515e"')}${text(582, 1385, displayDuration(b.service.minutes, language), 19, 'text-anchor="middle" fill="#55515e"')}
  ${text(718, 1269, tt("To"), 19)}${fitted(718, 1307, displayLocationName(getStation(b.service.to), language), 240, 27)}${b.service.arrivalDayOffset ? fitted(718, 1400, tt("Arrives {date}", { date: displayDate(b.service.arrivalDate, language) }), 240, 15) : ""}${text(718, 1378, b.service.arrival, 37, `fill="${purple}" font-weight="600"`)}
  <rect y="1420" width="1000" height="80" fill="#09090b"/><path d="M680 1500q100-100 320-80v80Z" fill="url(#${resourceId}-purple)"/>
  ${icon(42, 1438, "shield", 0.95)}${text(97, 1453, tt("AB TRAIN · Sample ticket"), 23, 'fill="#fff" font-weight="600"')}${text(97, 1480, tt("No official railway affiliation"), 17, 'fill="#d0cdd6"')}
  ${text(950, 1469, tt("Demo only"), 24, 'fill="#fff" text-anchor="end"')}
  </g><rect x="1" y="1" width="998" height="1498" rx="40" fill="none" stroke="#dedbe3"/>
  </svg>`;
}
export function readableQR(b) {
  const matrix = QRCode.create(qrData(b), {
    errorCorrectionLevel: "M",
  }).modules;
  let path = "";
  for (let row = 0; row < matrix.size; row++)
    for (let col = 0; col < matrix.size; col++)
      if (matrix.get(row, col)) path += `M${col + 4} ${row + 4}h1v1h-1Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${matrix.size + 8} ${matrix.size + 8}" role="img" aria-label="${escape(t("QR code containing this demo booking"))}"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black" shape-rendering="crispEdges"/></svg>`;
}
export async function ticketCanvas(b, language = getLanguage()) {
  const svg = ticketSVG(b, language),
    url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(new Error("Ticket image could not be rendered."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 2000;
    canvas.height = 3000;
    canvas.getContext("2d").drawImage(img, 0, 0, 2000, 3000);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function pngBlob(b, language = getLanguage()) {
  const canvas = await ticketCanvas(b, language);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG export failed.")),
      "image/png",
    ),
  );
}
export async function pdfBlob(b, language = getLanguage()) {
  const { jsPDF } = await import("jspdf");
  const canvas = await ticketCanvas(b, language),
    pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setProperties({
    title: `${t("AB TRAIN · Sample ticket", {}, language)} ${b.ticketId}`,
    subject: t("Sample — not valid for travel", {}, language),
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 15, 13.5, 180, 270);
  return pdf.output("blob");
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
