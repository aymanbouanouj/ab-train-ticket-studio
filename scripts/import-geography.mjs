import { readFileSync, writeFileSync } from "node:fs";
// Download https://download.geonames.org/export/dump/MA.zip and extract MA.txt first.
const places = readFileSync("data/MA.txt", "utf8")
  .trim()
  .split("\n")
  .map((line) => line.split("\t"))
  .filter(
    (c) =>
      c[8] === "MA" && c[6] === "P" && !["PPLQ", "PPLH", "PPLW"].includes(c[7]),
  )
  .map((c) => ({
    id: `geo-${c[0]}`,
    name: c[1],
    aliases: [...new Set([c[2], ...c[3].split(",")].filter(Boolean))],
    lat: +c[4],
    lon: +c[5],
    region: c[10],
    population: +c[14],
    feature: c[7],
  }))
  .sort(
    (a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id),
  );
writeFileSync("data/places.json", JSON.stringify(places));
writeFileSync(
  "data/geography-meta.json",
  JSON.stringify(
    {
      source: "GeoNames",
      url: "https://download.geonames.org/export/dump/MA.zip",
      license: "CC BY 4.0",
      retrieved: "2026-10-14",
      countryCode: "MA",
      count: places.length,
      filter:
        "All feature-class P records except abandoned, historical and destroyed settlements. No population threshold.",
      limitation:
        "Community-maintained geographic gazetteer, not an official government commune register; completeness is not guaranteed. Country attribution follows GeoNames. Railway stations are curated separately.",
    },
    null,
    2,
  ),
);
console.log(`Imported ${places.length} populated places.`);
