import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  searchLocations,
  searchStations,
  getStation,
  allPlaces,
  initializeGeography,
  locationDescription,
  stations,
  displayLocationName,
  normalize,
  officialCities,
  stationsForCity,
  cityStationLinks,
} from "../src/locations.js";
import {
  CLASSES,
  lines,
  validateSearch,
  searchServices,
  searchConnections,
  serviceDates,
  addDays,
  seatStatus,
  createBooking,
  fare,
  qrData,
  validatePassenger,
  isBooking,
  randomId,
} from "../src/booking.js";
import { loadBookings, saveBookings, STORAGE_KEY } from "../src/storage.js";
import QRCode from "qrcode";
import jsQR from "jsqr";
import corrections from "../data/location-corrections.json" with { type: "json" };
import { messages, t, displayDuration } from "../src/i18n.js";
import { ticketSVG } from "../src/ticket.js";
import { footerHTML, safeWebUrl } from "../src/footer.js";
import { siteConfig } from "../src/site-config.js";
initializeGeography(
  JSON.parse(
    readFileSync(new URL("../data/places.json", import.meta.url), "utf8"),
  ),
);
const date = "2099-11-05",
  service = searchServices("rabat-ville", "fes", date)[0];
const seat = Array.from({ length: 32 }, (_, i) => i + 1).find(
  (n) => seatStatus(service, "second", 3, n) === "available",
);
const selection = {
  service,
  travelClass: "second",
  coach: 3,
  seat,
  passenger: "Ayman El Amrani",
};
const booking = () => createBooking(selection);
test("All four translation catalogues contain every key and matching placeholders", () => {
  const keys = Object.keys(messages.en).sort();
  const placeholders = (value) =>
    [...value.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
  for (const language of ["en", "fr", "ar", "es"]) {
    assert.deepEqual(Object.keys(messages[language]).sort(), keys);
    for (const key of keys) {
      assert.ok(messages[language][key].trim(), `${language}: ${key}`);
      assert.deepEqual(
        placeholders(messages[language][key]),
        placeholders(key),
        key,
      );
    }
  }
  for (const file of [
    "../app.js",
    "../src/ticket.js",
    "../src/locations.js",
    "../src/footer.js",
    "../src/homepage.js",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const [, key] of source.matchAll(/\b(?:t|tt)\(\s*"([^"\n]+)"/g))
      assert.ok(Object.hasOwn(messages.en, key), key);
  }
});
test("Kit aliases and localizations keep station identity and supported routes explicit", () => {
  for (const alias of ["Tangier", "Tanger", "Tánger", "طنجة", "Tanger-ville"])
    assert.equal(searchLocations(alias)[0].id, "tangier");
  for (const alias of ["Meknes", "Meknès", "مكناس"])
    assert.equal(searchLocations(alias)[0].id, "meknes");
  for (const alias of ["Fes", "Fès", "فاس"])
    assert.equal(searchLocations(alias)[0].id, "fes");
  assert.equal(searchLocations("Casa")[0].id, "casa-voyageurs");
  assert.equal(searchLocations("Casa Port")[0].id, "casa-port");
  for (const destination of ["sidi-kacem", "fes"]) {
    const results = searchServices("rabat-ville", destination, date);
    assert.ok(results.length);
    assert.ok(
      results.every(
        (s) =>
          s.from === "rabat-ville" &&
          s.to === destination &&
          s.id.includes("atlas"),
      ),
    );
  }
  assert.throws(() =>
    validateSearch(
      searchLocations("Tanger")[0].id,
      searchLocations("طنجة")[0].id,
      date,
    ),
  );
  assert.equal(
    new Set([...stations, ...allPlaces].map((p) => p.id)).size,
    stations.length + allPlaces.length,
  );
  assert.ok(allPlaces.every((p) => !p.serviceable && p.provenance.source));
  assert.ok(
    stations.every(
      (p) =>
        p.serviceable &&
        p.region &&
        p.provenance.url &&
        ["en", "fr", "ar", "es"].every((lang) => displayLocationName(p, lang)),
    ),
  );
});
test("Footer publishes supplied links, omits missing contacts and rejects unsafe URLs", () => {
  const html = footerHTML(siteConfig);
  assert.ok(!html.includes("mailto:"));
  assert.equal(siteConfig.email, "");
  assert.ok(!html.includes("Get in touch by email."));
  assert.ok(html.includes("https://beacons.ai/aymanbounaouj"));
  assert.ok(!html.includes("Not published") && !html.includes("tel:"));
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,x",
    "https://user:password@example.org",
    "not a url",
  ])
    assert.equal(safeWebUrl(value), "");
  const empty = footerHTML({
    ...siteConfig,
    email: "",
    github: "",
    linkedin: "",
    beacons: "",
    blog: "",
    website: "javascript:alert(1)",
    phone: "",
    whatsapp: "",
  });
  assert.ok(!empty.includes('target="_blank"'));
  assert.ok(!empty.includes("javascript:"));
  assert.ok(
    footerHTML({
      ...siteConfig,
      fullName: "<script>alert(1)</script>",
    }).includes("&lt;script&gt;"),
  );
});
test("Translated tickets preserve booking identity and QR data without mutating saved records", () => {
  const b = booking(),
    original = JSON.stringify(b),
    payload = qrData(b);
  for (const language of ["en", "fr", "ar", "es"]) {
    const svg = ticketSVG(b, language);
    assert.ok(svg.includes(t("SAMPLE — NOT VALID FOR TRAVEL", {}, language)));
    assert.ok(svg.includes(b.ticketId));
    assert.equal(JSON.stringify(b), original);
    assert.equal(qrData(b), payload);
  }
  assert.equal(displayDuration(125, "ar"), "2 س 05 د");
});
const storage = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
};
test("HCP corrections separate municipalities from namesake neighbourhoods and never add services", () => {
  for (const entry of corrections.places) {
    assert.equal(searchLocations(entry.name)[0].id, entry.id);
    assert.deepEqual(searchServices(entry.id, "fes", date), []);
  }
  for (const entry of corrections.aliases)
    for (const name of entry.names) {
      assert.ok(
        searchLocations(name).some((p) => p.id === entry.id),
        name,
      );
    }
  for (const query of ["Bni Ansar", "Laayoune", "Boujdour", "Dakhla"]) {
    const p = searchLocations(query)[0];
    assert.equal(p.entityType, "Municipality", query);
    assert.equal(p.kind, "city");
    assert.match(locationDescription(p), /HCP municipality/);
    assert.deepEqual(searchServices(p.id, "fes", date), []);
  }
  assert.match(
    locationDescription(allPlaces.find((p) => p.id === "geo-8542188")),
    /Neighbourhood/,
  );
  for (const [query, id] of [
    ["Bouizakarne", "geo-2554594"],
    ["Boudnib", "geo-2555009"],
    ["M'rirt", "geo-2545069"],
    ["Loualidia", "geo-2541068"],
    ["مَرَاكِش", "marrakech"],
    ["الرباط المدينة", "rabat-ville"],
  ]) {
    assert.ok(
      searchLocations(query).some((p) => p.id === id),
      query,
    );
  }
});
test("Service validation compares values independently of object property order", () => {
  const reversed = Object.fromEntries(Object.entries(service).reverse());
  assert.ok(isBooking(createBooking({ ...selection, service: reversed })));
});
test("Storage rejects invented service identifiers and noncanonical creation timestamps", () => {
  const b = booking();
  for (const id of ["DEMO-atlas-fabricated-F-1", "DEMO-atlas-F-01"]) {
    const fakeService = { ...b.service, id };
    const fakeSeat = Array.from({ length: 32 }, (_, i) => i + 1).find(
      (n) => seatStatus(fakeService, "second", 3, n) === "available",
    );
    assert.equal(
      isBooking({ ...b, seat: fakeSeat, service: fakeService }),
      false,
    );
  }
  for (const createdAt of [
    2026,
    "2026-02-30T12:00:00.000Z",
    "10/14/2026",
    "2026-10-14T25:00:00.000Z",
  ]) {
    assert.equal(isBooking({ ...b, createdAt }), false);
  }
});
test("Duplicate saves cannot create damaged storage or overwrite existing records", () => {
  const s = storage(),
    b = booking();
  saveBookings([b], s);
  const original = s.getItem(STORAGE_KEY);
  assert.throws(() => saveBookings([b, b], s), /Duplicate/);
  assert.throws(
    () =>
      saveBookings(
        [b, { ...b, ticketId: randomId("ABT-"), reference: randomId("ABR-") }],
        s,
      ),
    /Duplicate/,
  );
  assert.equal(s.getItem(STORAGE_KEY), original);
});
test("Broad local gazetteer has traceable IDs and population-independent coverage", () => {
  assert.ok(allPlaces.length > 40000);
  assert.ok(allPlaces.some((p) => p.population === 0));
  assert.equal(new Set(allPlaces.map((p) => p.id)).size, allPlaces.length);
});
test("Station search supports common spellings, diacritics and geographic cities separately", () => {
  assert.ok(searchLocations("Fez").some((s) => s.id === "fes"));
  assert.ok(searchLocations("Tanger").some((s) => s.id === "tangier"));
  assert.ok(
    searchLocations("Casablanca").some((s) => s.id === "casa-voyageurs"),
  );
  assert.ok(searchLocations("Agadir").some((s) => s.kind === "city"));
  assert.equal(getStation("Agadir"), undefined);
  const s = searchLocations("rabat").filter((s) => s.kind === "station");
  assert.deepEqual(
    s.map((s) => s.name),
    [...s.map((s) => s.name)].sort((a, b) => a.localeCompare(b, "en")),
  );
});
test("Invalid origin/destination and dates are rejected", () => {
  assert.throws(() => validateSearch("fes", "fes", date));
  assert.throws(() => validateSearch(null, "fes", date));
  assert.throws(() => validateSearch("fes", "kenitra", "2026-02-30"));
  assert.throws(() => validateSearch("fes", "kenitra", "2020-01-01"));
});
test("Unsupported city and disconnected stations never fabricate services", () => {
  const city = searchLocations("Agadir").find((p) => p.kind === "city");
  assert.deepEqual(searchServices(city.id, "fes", date), []);
  assert.deepEqual(searchServices("casa-port", "tangier", date), []);
});
test("Service numbers, intervals and routes are deterministic in both directions", () => {
  assert.deepEqual(
    searchServices("rabat-ville", "fes", date),
    searchServices("rabat-ville", "fes", date),
  );
  for (const line of lines)
    for (const [a, b] of [
      [line.stops[0], line.stops.at(-1)],
      [line.stops.at(-1), line.stops[0]],
    ]) {
      for (const s of searchServices(a, b, date)) {
        const minutes = (t) => +t.slice(0, 2) * 60 + +t.slice(3);
        assert.equal(
          minutes(s.arrival) -
            minutes(s.departure) +
            (s.arrivalDayOffset || 0) * 1440,
          s.minutes,
        );
        assert.ok(minutes(s.arrival) < 1440);
        assert.ok(s.distance > 0);
      }
    }
});
test("Fares match explicit configurable rules", () => {
  assert.equal(fare({ distance: 100 }, "second"), 35);
  assert.equal(fare({ distance: 100 }, "first"), 60);
  assert.equal(fare({ distance: 10 }, "second"), 30);
  assert.throws(() => fare(service, "third"));
});
test("Names accept Unicode and long names but reject unsafe or invalid text", () => {
  assert.equal(validatePassenger("  Ayman   El Amrani  "), "Ayman El Amrani");
  assert.equal(validatePassenger("أحمد العلوي"), "أحمد العلوي");
  assert.ok(validatePassenger("Éléonore O’Connor-Abdelrahman"));
  assert.ok(validatePassenger("A".repeat(100)));
  for (const value of ["", "1", "<script>", "A".repeat(101)])
    assert.throws(() => validatePassenger(value));
});
test("Web Crypto identifiers have distinct namespaces and no sampled duplicates", () => {
  const ids = Array.from({ length: 2000 }, () => randomId("ABT-"));
  assert.equal(new Set(ids).size, ids.length);
  const b = booking();
  assert.notEqual(b.ticketId, b.reference);
  assert.match(b.ticketId, /^ABT-[0-9A-F]{24}$/);
  assert.match(b.reference, /^ABR-[0-9A-F]{24}$/);
});
test("Booking validates the complete service snapshot and coach/class/seat", () => {
  assert.ok(isBooking(booking()));
  assert.throws(() => createBooking({ ...selection, coach: 1 }));
  assert.throws(() => createBooking({ ...selection, seat: 33 }));
  assert.throws(() =>
    createBooking({
      ...selection,
      service: { ...service, departure: "00:00" },
    }),
  );
});
test("Local seat reservation rejects reuse on the same service/date", () => {
  const b = booking();
  assert.equal(seatStatus(service, "second", 3, seat, [b]), "reserved");
  assert.throws(() => createBooking(selection, [b]), /no longer available/);
  const next = searchServices("rabat-ville", "fes", "2099-11-06")[0];
  const nextSeat = Array.from({ length: 32 }, (_, i) => i + 1).find(
    (n) => seatStatus(next, "second", 3, n) === "available",
  );
  assert.ok(
    createBooking({ ...selection, service: next, seat: nextSeat }, [b]),
  );
});
test("QR payload matches every displayed booking field and is explicitly a demo", () => {
  const b = booking(),
    q = JSON.parse(qrData(b));
  assert.equal(q.ticket, b.ticketId);
  assert.equal(q.booking, b.reference);
  assert.equal(q.passenger, b.passenger);
  assert.equal(q.from, "Rabat Ville");
  assert.equal(q.to, "Fes");
  assert.equal(q.coach, b.coach);
  assert.equal(q.seat, b.seat);
  assert.equal(q.validForTravel, false);
  assert.equal(q.v, 1);
  assert.equal(q.fare, b.price);
});
test("Real QR decoding round trips full versioned payload with Unicode and long name", () => {
  const b = createBooking({
      ...selection,
      passenger: "Éléonore Abdelrahman ".repeat(4).trim(),
    }),
    payload = qrData(b);
  const m = QRCode.create(payload, { errorCorrectionLevel: "M" }).modules,
    scale = 8,
    size = (m.size + 8) * scale,
    pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < m.size; y++)
    for (let x = 0; x < m.size; x++)
      if (m.get(y, x))
        for (let yy = 0; yy < scale; yy++)
          for (let xx = 0; xx < scale; xx++) {
            const p =
              (((y + 4) * scale + yy) * size + (x + 4) * scale + xx) * 4;
            pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
          }
  assert.equal(jsQR(pixels, size, size).data, payload);
});
test("Persistence preserves identifiers and QR content across reloads", () => {
  const s = storage(),
    b = booking();
  saveBookings([b], s);
  const restored = loadBookings(s).bookings[0];
  assert.deepEqual(restored, b);
  assert.equal(qrData(restored), qrData(b));
});
test("Corrupt, tampered and duplicate stored records are handled safely", () => {
  const s = storage(),
    b = booking();
  s.setItem(STORAGE_KEY, "{bad");
  assert.ok(loadBookings(s).warning);
  s.setItem(STORAGE_KEY, JSON.stringify([b, b, { ...b, price: 99999 }]));
  assert.equal(loadBookings(s).bookings.length, 1);
  assert.ok(loadBookings(s).warning);
  assert.equal(
    isBooking({ ...b, service: { ...b.service, arrival: "00:00" } }),
    false,
  );
  assert.equal(isBooking({ ...b, seat: 0 }), false);
});
test("Storage quota errors are reported and unknown sensitive fields are stripped", () => {
  assert.throws(
    () =>
      saveBookings([booking()], {
        setItem() {
          throw new Error();
        },
      }),
    /Could not save/,
  );
  const s = storage();
  saveBookings([{ ...booking(), email: "not-retained" }], s);
  assert.ok(!s.getItem(STORAGE_KEY).includes("not-retained"));
});
test("Historical saved tickets remain valid and retain their data", () => {
  const b = booking();
  b.date = b.service.date = "2020-01-01"; // pick a seat matching the historical deterministic model
  b.seat = Array.from({ length: 32 }, (_, i) => i + 1).find(
    (n) => seatStatus(b.service, b.travelClass, b.coach, n) === "available",
  );
  assert.ok(isBooking(b));
});

test("Official urban coverage reconciles source rows without promoting rural communes", () => {
  const coverage = JSON.parse(readFileSync("data/official-city-coverage.json"));
  assert.equal(officialCities.length, coverage.included);
  assert.equal(
    coverage.included + coverage.excludedUnclassifiedOrRural,
    coverage.inputCommuneRows,
  );
  assert.equal(
    new Set(officialCities.map((c) => c.id)).size,
    officialCities.length,
  );
  assert.deepEqual(coverage.unresolved, []);
  for (const c of officialCities)
    assert.equal(allPlaces.find((p) => p.id === c.id).kind, "city");
  for (const id of ["hcp-01.573.01.09", "hcp-09.163.01.01"]) {
    const p = allPlaces.find((p) => p.id === id);
    assert.equal(p.kind, "locality");
    assert.equal(p.entityType, "Commune");
  }
  assert.equal(stations.length, cityStationLinks.length);
  for (const station of stations) {
    assert.equal(station.passengerServiceStatus, "verified");
    if (station.cityId)
      assert.ok(officialCities.some((c) => c.id === station.cityId));
    else assert.ok(["bouskoura", "mohammed-v-airport"].includes(station.id));
    assert.equal(station.provenance.effective, "2026-09-14");
  }
  assert.deepEqual(
    stationsForCity("hcp-04.421.01.0")
      .map((s) => s.id)
      .sort(),
    ["rabat-agdal", "rabat-ville"],
  );
  assert.equal(stationsForCity("hcp-06.141.01.0").length, 4);
  assert.deepEqual(stationsForCity("unknown"), []);
});
test("Search tolerates diacritics, presentation forms, transliteration and one typo without merging IDs", () => {
  assert.equal(normalize("AÏN—Al ' GHARB"), normalize("ain el gharb"));
  assert.equal(normalize("ﺍﻟﺮﺑﺎﻁ"), normalize("الرباط"));
  assert.equal(normalize("مَـرَاكِش"), normalize("مراكش"));
  assert.ok(searchLocations("Marrakch").some((p) => p.id === "marrakech"));
  assert.ok(
    searchLocations("sidi yahya al gharb").some(
      (p) => p.id === "hcp-04.491.01.09",
    ),
  );
  assert.equal(searchLocations("Casa-Port")[0].id, "casa-port");
  assert.equal(searchLocations("RABAT agdal")[0].id, "rabat-agdal");
  assert.notEqual(
    searchLocations("Rabat Agdal")[0].id,
    searchLocations("Rabat Ville")[0].id,
  );
});

test("Airport aliases and evidence keep station and city identities distinct", () => {
  for (const query of [
    "CMN",
    "Aéroport Mohammed V",
    "مطار محمد الخامس",
    "Mohammed V Airport",
  ])
    assert.equal(searchLocations(query)[0].id, "mohammed-v-airport");
  assert.equal(getStation("bouskoura").cityId, null);
  assert.equal(
    getStation("mohammed-v-airport").provenance.effective,
    "2026-09-14",
  );
  assert.equal(
    searchServices("casa-port", "mohammed-v-airport", date).length,
    0,
  );
});
test("Overnight services retain next-day dates in storage, translations and QR", () => {
  const service = searchServices(
    "casa-voyageurs",
    "mohammed-v-airport",
    "2099-12-31",
  ).at(-1);
  assert.equal(service.departure, "23:20");
  assert.equal(service.arrival, "00:08");
  assert.equal(service.arrivalDate, "2100-01-01");
  const seat = Array.from({ length: 32 }, (_, i) => i + 1).find(
    (n) => seatStatus(service, "second", 3, n) === "available",
  );
  const b = createBooking({
    service,
    passenger: "Ayman Bounaouj",
    travelClass: "second",
    coach: 3,
    seat,
  });
  const store = storage();
  saveBookings([b], store);
  assert.deepEqual(loadBookings(store).bookings[0], b);
  assert.equal(JSON.parse(qrData(b)).arrivalDate, "2100-01-01");
  assert.equal(JSON.parse(qrData(b)).timeZone, "Africa/Casablanca");
  for (const lang of ["en", "fr", "ar", "es"]) {
    const svg = ticketSVG(b, lang);
    assert.ok(!svg.includes("{date}"));
    assert.ok(svg.includes("2100"));
  }
  const damaged = structuredClone(b);
  damaged.service.arrivalDate = "2099-12-31";
  assert.equal(isBooking(damaged), false);
});
test("Civil date arithmetic handles leap days independently of device time zone", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2028-02-29", 1), "2028-03-01");
  assert.deepEqual(serviceDates("2028-03-31", 1400, 48), {
    departureDate: "2028-03-31",
    arrivalDate: "2028-04-01",
    arrivalDayOffset: 1,
  });
  for (const day of ["2099-02-15", "2099-03-15"])
    assert.equal(
      searchServices("casa-voyageurs", "mohammed-v-airport", day).at(-1)
        .minutes,
      48,
    );
});
test("Connections use existing services at the same station with bounded transfer time", () => {
  const list = searchConnections("fes", "mohammed-v-airport", date);
  assert.ok(list.length);
  assert.deepEqual(list, searchConnections("fes", "mohammed-v-airport", date));
  for (const c of list) {
    assert.equal(c.first.to, c.second.from);
    assert.equal(c.first.to, c.via);
    assert.ok(c.wait >= 20 && c.wait <= 360);
    assert.equal(c.minutes, c.first.minutes + c.wait + c.second.minutes);
    assert.ok(
      searchServices(c.first.from, c.first.to, c.first.date).some(
        (s) => s.id === c.first.id,
      ),
    );
    assert.ok(
      searchServices(c.second.from, c.second.to, c.second.date).some(
        (s) => s.id === c.second.id,
      ),
    );
  }
  assert.deepEqual(searchConnections("fes", "rabat-ville", date), []);
  assert.deepEqual(searchConnections("unknown", "fes", date), []);
});

test("Legacy services reject injected rollover metadata", () => {
  const b = booking();
  b.service.arrivalDate = "2100-01-01";
  assert.equal(isBooking(b), false);
});

test("Booking search exposes only all 22 serviceable registry stations, preserving multilingual aliases", () => {
  const eligible = stations.filter(
    (p) => p.kind === "station" && p.id && p.serviceable,
  );
  assert.equal(eligible.length, 22);
  assert.deepEqual(
    searchStations().map((p) => p.id),
    eligible.map((p) => p.id),
  );
  for (const station of eligible) {
    for (const query of [
      station.name,
      ...station.aliases,
      ...Object.values(station.displayNames),
    ]) {
      assert.ok(
        searchStations(query).some((p) => p.id === station.id),
        query,
      );
      assert.ok(searchStations(query).every((p) => eligible.includes(p)));
    }
  }
  for (const query of ["Agadir", "Chefchaouen", "geo-8542188", "zzzzzzzz"]) {
    assert.deepEqual(searchStations(query), []);
  }
  assert.ok(searchStations("AÏN SEBAÂ").some((p) => p.id === "ain-sebaa"));
  assert.ok(searchStations("Marrakch").some((p) => p.id === "marrakech"));
  assert.ok(searchLocations("Agadir").some((p) => p.kind === "city"));
});
