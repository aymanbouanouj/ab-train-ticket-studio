import regions from "../data/region-labels.json" with { type: "json" };
import corrections from "../data/location-corrections.json" with { type: "json" };
import { t, getLanguage } from "./i18n.js";
import presentation from "../data/station-presentation.json" with { type: "json" };
import cities from "../data/official-cities.json" with { type: "json" };
import evidence from "../data/station-evidence.json" with { type: "json" };
export const officialCities = cities;
export const cityStationLinks = evidence.links;
export const normalize = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ـ/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\bal\b/g, "el");
const station = (id, name, city, aliases = []) => ({
  id,
  name,
  city,
  aliases: [
    ...new Set([
      ...aliases,
      ...["fr", "ar", "es"].map((lang) => presentation[id][lang]),
    ]),
  ],
  kind: "station",
  entityType: "Railway station",
  serviceable: evidence.links.some(
    (link) =>
      link.stationId === id && link.passengerServiceStatus === "verified",
  ),
  passengerServiceStatus:
    evidence.links.find((link) => link.stationId === id)
      ?.passengerServiceStatus || "unverified",
  cityId: evidence.links.find((link) => link.stationId === id)?.cityId || null,
  region: presentation[id].region,
  displayNames: {
    en: name,
    ...Object.fromEntries(
      ["fr", "ar", "es"].map((lang) => [lang, presentation[id][lang]]),
    ),
  },
  provenance: {
    source: "ONCF passenger timetable",
    ...evidence.sources[
      evidence.links.find((link) => link.stationId === id)?.source
    ],
  },
});
export const stations = [
  station("bouskoura", "Bouskoura", "Bouskoura", ["Bouskura", "بوسكورة"]),
  station("mohammed-v-airport", "Mohammed V Airport", "Nouaceur", [
    "CMN",
    "Aéroport Med V",
    "Mohamed V",
    "مطار محمد الخامس",
  ]),
  station("marrakech", "Marrakech", "Marrakech", ["Marrakesh", "مراكش"]),
  station("benguerir", "Benguerir", "Benguerir", ["Ben Guerir", "ابن جرير"]),
  station("settat", "Settat", "Settat", ["سطات"]),
  station("berrechid", "Berrechid", "Berrechid", ["برشيد"]),
  station("oasis", "Casablanca Oasis", "Casablanca", ["L’Oasis", "Casa Oasis"]),
  station("casa-voyageurs", "Casablanca Voyageurs", "Casablanca", [
    "Casa Voyageurs",
    "Casa",
    "الدار البيضاء",
  ]),
  station("casa-port", "Casablanca Port", "Casablanca", ["Casa Port"]),
  station("ain-sebaa", "Ain Sebaa", "Casablanca", ["Ain Sbaa", "Aïn Sebaâ"]),
  station("mohammedia", "Mohammedia", "Mohammedia", ["Mohamedia"]),
  station("rabat-agdal", "Rabat Agdal", "Rabat", ["الرباط"]),
  station("rabat-ville", "Rabat Ville", "Rabat", ["الرباط المدينة"]),
  station("sale", "Sale Ville", "Sale", ["Salé", "سلا"]),
  station("kenitra", "Kenitra", "Kenitra", ["Kénitra", "القنيطرة"]),
  station("sidi-yahia", "Sidi Yahia", "Sidi Yahia", ["Sidi Yahya"]),
  station("sidi-slimane", "Sidi Slimane", "Sidi Slimane", ["سيدي سليمان"]),
  station("sidi-kacem", "Sidi Kacem", "Sidi Kacem", ["سيدي قاسم"]),
  station("meknes", "Meknes", "Meknes", ["Meknès", "مكناس"]),
  station("ain-taoujdat", "Ain Taoujdat", "Ain Taoujdat", ["Aïn Taoujdate"]),
  station("fes", "Fes", "Fes", ["Fez", "Fès", "فاس"]),
  station("tangier", "Tangier Ville", "Tangier", [
    "Tanger",
    "Tangier",
    "Tánger",
    "Tanger Ville",
    "طنجة",
  ]),
].sort((a, b) => a.name.localeCompare(b.name, "en"));
export let allPlaces = [];
let indexed = stations.map((p) => ({
  ...p,
  search: normalize([p.name, p.city, ...p.aliases].join(" ")),
}));
export function initializeGeography(places) {
  const additions = new Map(corrections.aliases.map((p) => [p.id, p.names]));
  // Merge only matching stable HCP identifiers; names alone never establish identity.
  const records = new Map(
    [...places, ...corrections.places].map((p) => [p.id, p]),
  );
  for (const city of cities) {
    const previous = records.get(city.id);
    records.set(city.id, {
      ...previous,
      ...city,
      aliases: [...new Set([...(previous?.aliases || []), ...city.aliases])],
    });
  }
  allPlaces = [...records.values()].map((p) => ({
    ...p,
    aliases: [...new Set([...p.aliases, ...(additions.get(p.id) || [])])],
    kind: p.type === "urban_commune" ? "city" : "locality",
    entityType:
      p.entityType || (p.feature === "PPLX" ? "Neighbourhood" : "Locality"),
    serviceable: false,
    displayNames: {
      en: p.name,
      fr: p.name,
      es: p.name,
      ar:
        p.aliases.find((name) => /^[\p{Script=Arabic}\s\d-]+$/u.test(name)) ||
        p.name,
      ...p.displayNames,
    },
    provenance:
      p.provenance ||
      (p.id.startsWith("hcp-")
        ? {
            source: corrections.source,
            url: corrections.url,
            page: p.sourcePage,
          }
        : {
            source: "GeoNames",
            url: `https://www.geonames.org/${p.id.slice(4)}`,
            license: "CC BY 4.0",
          }),
  }));
  indexed = [...stations, ...allPlaces].map((p) => ({
    ...p,
    search: normalize(
      [p.name, p.city, p.area, ...p.aliases].filter(Boolean).join(" "),
    ),
  }));
}
let geographyPromise;
export function loadGeography() {
  if (allPlaces.length) return Promise.resolve();
  if (!geographyPromise)
    geographyPromise = fetch(new URL("../data/places.json", import.meta.url))
      .then((response) => {
        if (!response.ok)
          throw new Error(
            "The local city database could not be loaded. Refresh to retry.",
          );
        return response.json();
      })
      .then(initializeGeography)
      .catch(() => {
        geographyPromise = null;
        throw new Error(
          "The local city database could not be loaded. Refresh to retry.",
        );
      });
  return geographyPromise;
}
export function searchLocations(query = "", limit = 60) {
  const q = normalize(query);
  const rank = (p) =>
    [p.name, ...(p.aliases || [])].some((name) => normalize(name) === q)
      ? 0
      : 1;
  let matches = indexed.filter(
    (p) => !q || q.split(" ").every((word) => p.search.includes(word)),
  );
  // Conservative typo tolerance is a suggestion, never an identity merge.
  if (q.length >= 5 && matches.length < limit) {
    const exactIds = new Set(matches.map((p) => p.id));
    matches.push(
      ...indexed.filter(
        (p) =>
          !exactIds.has(p.id) &&
          (!matches.length || p.kind === "station" || p.kind === "city") &&
          [p.name, ...p.aliases].some((name) =>
            oneEditApart(normalize(name), q),
          ),
      ),
    );
  }
  return matches
    .sort(
      (a, b) =>
        groupOrder(a) - groupOrder(b) ||
        (q ? rank(a) - rank(b) : 0) ||
        (a.entityType === "Municipality" ? 0 : 1) -
          (b.entityType === "Municipality" ? 0 : 1) ||
        a.name.localeCompare(b.name, "en") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
// Booking autocomplete never searches or falls back to the geographic gazetteer.
export function searchStations(query = "") {
  const q = normalize(query);
  return stations
    .filter((p) => p.kind === "station" && p.id && p.serviceable)
    .filter((p) => {
      const names = [p.name, p.city, ...p.aliases];
      const search = normalize(names.join(" "));
      return (
        !q ||
        q.split(" ").every((word) => search.includes(word)) ||
        (q.length >= 5 &&
          names.some((name) => oneEditApart(normalize(name), q)))
      );
    });
}
function groupOrder(p) {
  return p.kind === "station"
    ? 0
    : p.kind === "city"
      ? stationsForCity(p.id).length
        ? 1
        : 2
      : 3;
}
function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}
export function locationDescription(p) {
  if (p.kind === "station") return t("Railway station · demo routes");
  if (p.entityType === "Municipality")
    return `${t("HCP municipality")} · ${regions.names[p.region] || t("region {region}", { region: p.region })} · ${t(stationsForCity(p.id).length ? "Choose a station" : "No confirmed passenger service in this demo")}`;
  if (p.entityType === "Commune")
    return `${t("Commune · urban status unconfirmed")} · HCP`;
  return `${t(p.feature === "PPLX" ? "Neighbourhood" : "City / locality")} · ${t("region {region}", { region: p.region || t("unspecified") })} · GeoNames #${p.id.slice(4)}`;
}
export function stationsForCity(id) {
  return stations.filter(
    (station) => station.cityId === id && station.serviceable,
  );
}
export function getStation(id) {
  return stations.find((s) => s.id === id);
}
export function getLocation(id) {
  return getStation(id) || allPlaces.find((p) => p.id === id);
}
// Presentation never replaces stable IDs or canonical names used in saved/QR data.
export function displayLocationName(place, language = getLanguage()) {
  return place?.displayNames?.[language] || place?.name || "";
}
