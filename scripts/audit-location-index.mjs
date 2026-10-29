import { readFileSync, writeFileSync } from "node:fs";
import {
  initializeGeography,
  allPlaces,
  stations,
  normalize,
  searchLocations,
  officialCities,
  cityStationLinks,
} from "../src/locations.js";
import { lines, searchServices } from "../src/booking.js";
initializeGeography(JSON.parse(readFileSync("data/places.json", "utf8")));
const records = [...stations, ...allPlaces];
const counts = {},
  ids = new Set(),
  duplicates = [],
  names = new Map();
for (const p of records) {
  counts[p.entityType] = (counts[p.entityType] || 0) + 1;
  if (ids.has(p.id)) duplicates.push(p.id);
  ids.add(p.id);
  const key = normalize(p.name);
  if (!names.has(key)) names.set(key, []);
  names.get(key).push(p.id);
}
const ambiguousNames = [...names]
  .filter(([, ids]) => ids.length > 1)
  .map(([name, ids]) => ({ name, ids }));
const supportedPairs = [];
for (const a of stations)
  for (const b of stations)
    if (a.id !== b.id && searchServices(a.id, b.id, "2099-11-05").length)
      supportedPairs.push([a.id, b.id]);
const report = {
  reviewed: "2026-10-15",
  passengerEvidence: JSON.parse(readFileSync("data/station-evidence.json", "utf8")),
  sources: JSON.parse(readFileSync("data/geography-meta.json", "utf8")),
  reviewedSources: JSON.parse(
    readFileSync("data/geography-review-sources.json", "utf8"),
  ),
  countsByType: counts,
  uniqueGeographicIDs: new Set(allPlaces.map((p) => p.id)).size,
  uniqueStationIDs: new Set(stations.map((p) => p.id)).size,
  officialUrbanCities: officialCities.length,
  mappedStations: stations.filter((s) =>
    officialCities.some((c) => c.id === s.cityId),
  ).length,
  mappedCities: new Set(cityStationLinks.map((l) => l.cityId)).size,
  confirmedBookableStations: stations.filter(
    (s) => s.serviceable && s.passengerServiceStatus === "verified",
  ).length,
  unresolvedStationMappings: stations
    .filter((s) => !officialCities.some((c) => c.id === s.cityId))
    .map((s) => s.id),
  officialCityCoverage: JSON.parse(
    readFileSync("data/official-city-coverage.json", "utf8"),
  ),
  duplicateIDs: duplicates,
  unsupportedGeographicRecords: allPlaces.filter((p) => !p.serviceable).length,
  unsupportedMeaning:
    "All geographic results require explicit station selection. This count does not assert absence of real railway connections.",
  ambiguousNameGroups: ambiguousNames.length,
  ambiguousNames,
  supportedDirectedStationPairs: supportedPairs.length,
  supportedPairs,
  routes: lines.map(({ id, stops }) => ({ id, stops })),
  aliases: Object.fromEntries(
    [
      "Tangier",
      "Tanger",
      "Tánger",
      "طنجة",
      "Tanger-ville",
      "Casa",
      "Casa Port",
      "Meknès",
      "مكناس",
      "Fès",
      "فاس",
    ].map((q) => [
      q,
      searchLocations(q)
        .filter((p) => p.kind === "station")
        .map((p) => p.id),
    ]),
  ),
  limitations: [
    "All 221 entities in the documented historical urban-classification scope are matched to RGPH 2024; subsequent classification changes have not been exhaustively established.",
    "Only the 20 existing demo stations are inventoried, verified against passenger timetables effective 14 September 2026. This is not a national station census.",
    "Ambiguous names retain separate source IDs; no fuzzy identity merge.",
    "No evidence-supported nearby-station distances/links were added.",
    "Source spelling is the fallback when translated names are unavailable.",
    "All schedules, stopping patterns and prices are simulated; no live operator API.",
  ],
};
writeFileSync(
  "data/location-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      counts,
      uniqueGeographicIDs: report.uniqueGeographicIDs,
      uniqueStationIDs: report.uniqueStationIDs,
      duplicates: duplicates.length,
      ambiguousNames: ambiguousNames.length,
      supportedPairs: supportedPairs.length,
    },
    null,
    2,
  ),
);
if (duplicates.length) process.exitCode = 1;
