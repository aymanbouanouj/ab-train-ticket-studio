import { getStation, stations } from "./locations.js";
export const CLASSES = {
  first: { name: "First Class", multiplier: 1.6, coaches: [1, 2], seats: 24 },
  second: {
    name: "Second Class",
    multiplier: 1,
    coaches: [3, 4, 5],
    seats: 32,
  },
};
export const FARE_RULES = { minimum: 30, perKm: 0.35, rounding: 5 };
// Cumulative demo distance/time; these are not live ONCF timetables or measured distances.
export const lines = [
  {
    id: "atlas",
    name: "Atlas demo",
    stops: [
      "marrakech",
      "benguerir",
      "settat",
      "berrechid",
      "oasis",
      "casa-voyageurs",
      "ain-sebaa",
      "mohammedia",
      "rabat-agdal",
      "rabat-ville",
      "sale",
      "kenitra",
      "sidi-yahia",
      "sidi-slimane",
      "sidi-kacem",
      "meknes",
      "ain-taoujdat",
      "fes",
    ],
    km: [
      0, 70, 170, 200, 238, 245, 254, 270, 350, 354, 358, 390, 416, 441, 461,
      501, 524, 550,
    ],
    minutes: [
      0, 45, 105, 125, 153, 165, 178, 195, 250, 260, 272, 300, 320, 340, 360,
      393, 410, 435,
    ],
  },
  {
    id: "north",
    name: "Northern demo",
    stops: ["casa-voyageurs", "rabat-agdal", "kenitra", "tangier"],
    km: [0, 100, 145, 330],
    minutes: [0, 65, 100, 210],
  },
  {
    id: "coast",
    name: "Coastal demo",
    stops: [
      "casa-port",
      "ain-sebaa",
      "mohammedia",
      "rabat-agdal",
      "rabat-ville",
      "sale",
      "kenitra",
    ],
    km: [0, 12, 30, 105, 109, 113, 145],
    minutes: [0, 15, 32, 90, 100, 110, 138],
  },
  {
    id: "airport",
    name: "Airport demo",
    stops: ["casa-voyageurs", "oasis", "bouskoura", "mohammed-v-airport"],
    km: [0, 7, 22, 35],
    minutes: [0, 12, 28, 48],
    departures: [360, 840, 1400],
  },
];
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function validDate(value) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateSearch(from, to, date, min = today()) {
  if (!from || !to)
    throw new Error(
      "Choose both a departure and an arrival location from the suggestions.",
    );
  if (from === to) throw new Error("Departure and arrival must be different.");
  if (!validDate(date) || date < min)
    throw new Error("Choose today or a future travel date.");
}
export const clock = (n) =>
  `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const duration = (n) =>
  `${Math.floor(n / 60)}h ${String(n % 60).padStart(2, "0")}m`;
export function fare(service, travelClass) {
  if (
    !CLASSES[travelClass] ||
    !Number.isFinite(service.distance) ||
    service.distance <= 0
  )
    throw new Error("Invalid fare selection.");
  return (
    Math.ceil(
      (Math.max(FARE_RULES.minimum, service.distance * FARE_RULES.perKm) *
        CLASSES[travelClass].multiplier) /
        FARE_RULES.rounding,
    ) * FARE_RULES.rounding
  );
}
export function searchServices(from, to, date) {
  validateSearch(from, to, date);
  if (!getStation(from) || !getStation(to)) return [];
  const results = [];
  for (const line of lines) {
    const a = line.stops.indexOf(from),
      b = line.stops.indexOf(to);
    if (a < 0 || b < 0) continue;
    const reverse = a > b,
      offset = reverse
        ? line.minutes.at(-1) - line.minutes[a]
        : line.minutes[a];
    const minutes = Math.abs(line.minutes[b] - line.minutes[a]);
    (line.departures || [360, 600, 840]).forEach((base, slot) =>
      results.push({
        id: `DEMO-${line.id}-${reverse ? "R" : "F"}-${slot + 1}`,
        number: `D${lines.indexOf(line) + 1}${reverse ? "2" : "1"}${slot + 1}`,
        name: line.name,
        from,
        to,
        date,
        departure: clock(base + offset),
        arrival: clock(base + offset + minutes),
        ...(line.departures ? serviceDates(date, base + offset, minutes) : {}),
        minutes,
        distance: Math.abs(line.km[b] - line.km[a]),
      }),
    );
  }
  return results.sort((a, b) => a.departure.localeCompare(b.departure));
}
// Civil dates are independent of the browser timezone; schedules use Casablanca wall time.
export function addDays(date, days) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function serviceDates(date, departure, minutes) {
  return {
    departureDate: addDays(date, Math.floor(departure / 1440)),
    arrivalDate: addDays(date, Math.floor((departure + minutes) / 1440)),
    arrivalDayOffset:
      Math.floor((departure + minutes) / 1440) - Math.floor(departure / 1440),
  };
}
const hash = (s) =>
  Array.from(s).reduce(
    (a, c) => (Math.imul(a, 31) + c.codePointAt(0)) >>> 0,
    7,
  );
export function seatStatus(service, travelClass, coach, seat, bookings = []) {
  const cfg = CLASSES[travelClass];
  if (
    !cfg ||
    !cfg.coaches.includes(coach) ||
    !Number.isInteger(seat) ||
    seat < 1 ||
    seat > cfg.seats
  )
    return "unavailable";
  if (
    bookings.some(
      (b) =>
        b.service.id === service.id &&
        b.date === service.date &&
        b.coach === coach &&
        b.seat === seat,
    )
  )
    return "reserved";
  return hash(`${service.id}|${service.date}|${coach}|${seat}`) % 11 === 0
    ? "unavailable"
    : "available";
}
export function availableCount(service, travelClass, bookings = []) {
  const c = CLASSES[travelClass];
  return c.coaches.reduce(
    (n, coach) =>
      n +
      Array.from(
        { length: c.seats },
        (_, i) =>
          seatStatus(service, travelClass, coach, i + 1, bookings) ===
          "available",
      ).filter(Boolean).length,
    0,
  );
}
export function validatePassenger(name) {
  const clean = String(name).trim().replace(/\s+/gu, " ");
  if (
    [...clean].length < 2 ||
    [...clean].length > 100 ||
    !/^[\p{L}\p{M} .’'\-]+$/u.test(clean) ||
    !/\p{L}/u.test(clean)
  )
    throw new Error(
      "Enter a name of 2–100 characters using letters, spaces, apostrophes or hyphens.",
    );
  return clean;
}
export function randomId(prefix) {
  return (
    prefix +
    Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
      b.toString(16).padStart(2, "0"),
    )
      .join("")
      .toUpperCase()
  );
}
export function createBooking(selection, bookings = []) {
  const passenger = validatePassenger(selection.passenger),
    service = selection.service;
  validateSearch(service.from, service.to, service.date);
  const canonical = searchServices(service.from, service.to, service.date).find(
    (s) => s.id === service.id,
  );
  if (
    !canonical ||
    Object.keys(canonical).some((key) => canonical[key] !== service[key])
  )
    throw new Error("Choose a valid simulated service.");
  if (
    seatStatus(
      service,
      selection.travelClass,
      selection.coach,
      selection.seat,
      bookings,
    ) !== "available"
  )
    throw new Error("This seat is no longer available. Choose another seat.");
  return {
    version: 1,
    ticketId: randomId("ABT-"),
    reference: randomId("ABR-"),
    passenger,
    service: { ...canonical },
    date: service.date,
    travelClass: selection.travelClass,
    coach: selection.coach,
    seat: selection.seat,
    price: fare(service, selection.travelClass),
    currency: "MAD",
    createdAt: new Date().toISOString(),
    status: "Demo confirmed",
  };
}
export function qrData(b) {
  return JSON.stringify({
    app: "AB TRAIN DEMO",
    v: 1,
    ticket: b.ticketId,
    booking: b.reference,
    passenger: b.passenger,
    from: getStation(b.service.from).name,
    to: getStation(b.service.to).name,
    date: b.date,
    service: b.service.id,
    departure: b.service.departure,
    arrival: b.service.arrival,
    ...(b.service.arrivalDate
      ? {
          arrivalDate: b.service.arrivalDate,
          departureDate: b.service.departureDate,
          timeZone: "Africa/Casablanca",
        }
      : {}),
    class: CLASSES[b.travelClass].name,
    coach: b.coach,
    seat: b.seat,
    fare: b.price,
    currency: b.currency,
    status: b.status,
    validForTravel: false,
  });
}
export function isBooking(b) {
  try {
    if (
      !b ||
      b.version !== 1 ||
      !/^ABT-[A-F0-9]{24}$/.test(b.ticketId) ||
      !/^ABR-[A-F0-9]{24}$/.test(b.reference) ||
      b.status !== "Demo confirmed" ||
      b.currency !== "MAD" ||
      !validDate(b.date) ||
      typeof b.createdAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(b.createdAt) ||
      !Number.isFinite(Date.parse(b.createdAt)) ||
      new Date(b.createdAt).toISOString() !== b.createdAt ||
      validatePassenger(b.passenger) !== b.passenger ||
      b.date !== b.service.date
    )
      return false;
    // Historical bookings stay valid after their travel day.
    const line = lines.find((l) => b.service.id.startsWith(`DEMO-${l.id}-`));
    if (!line) return false;
    if (
      !line.departures &&
      ["departureDate", "arrivalDate", "arrivalDayOffset"].some(
        (key) => b.service[key] !== undefined,
      )
    )
      return false;
    const a = line.stops.indexOf(b.service.from),
      d = line.stops.indexOf(b.service.to),
      match = /-(F|R)-([123])$/.exec(b.service.id);
    if (
      a < 0 ||
      d < 0 ||
      a === d ||
      !match ||
      match[1] !== (a > d ? "R" : "F") ||
      b.service.id !== `DEMO-${line.id}-${match[1]}-${match[2]}`
    )
      return false;
    const reverse = a > d,
      offset = reverse
        ? line.minutes.at(-1) - line.minutes[a]
        : line.minutes[a],
      base = (line.departures || [360, 600, 840])[+match[2] - 1];
    if (
      line.departures &&
      Object.entries(
        serviceDates(
          b.date,
          base + offset,
          Math.abs(line.minutes[d] - line.minutes[a]),
        ),
      ).some(([key, value]) => b.service[key] !== value)
    )
      return false;
    return (
      b.service.number ===
        `D${lines.indexOf(line) + 1}${reverse ? "2" : "1"}${match[2]}` &&
      b.service.name === line.name &&
      b.service.departure === clock(base + offset) &&
      b.service.arrival ===
        clock(base + offset + Math.abs(line.minutes[d] - line.minutes[a])) &&
      b.service.minutes === Math.abs(line.minutes[d] - line.minutes[a]) &&
      b.service.distance === Math.abs(line.km[d] - line.km[a]) &&
      b.price === fare(b.service, b.travelClass) &&
      seatStatus(b.service, b.travelClass, b.coach, b.seat, []) === "available"
    );
  } catch {
    return false;
  }
}

// Advisory connections join two simulated runs at the same verified station.
// Each leg needs its own booking; this is not a protected through reservation.
export function searchConnections(from, to, date) {
  validateSearch(from, to, date);
  if (
    !getStation(from) ||
    !getStation(to) ||
    searchServices(from, to, date).length
  )
    return [];
  const minute = (value) =>
    Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const options = [];
  for (const station of stations) {
    if ([from, to].includes(station.id)) continue;
    for (const first of searchServices(from, station.id, date)) {
      const arrival = minute(first.departure) + first.minutes;
      for (const day of [0, 1]) {
        for (const second of searchServices(
          station.id,
          to,
          addDays(date, day),
        )) {
          const wait = day * 1440 + minute(second.departure) - arrival;
          if (wait < 20 || wait > 360) continue;
          options.push({
            via: station.id,
            first,
            second,
            wait,
            minutes: first.minutes + wait + second.minutes,
          });
        }
      }
    }
  }
  return options
    .sort(
      (a, b) =>
        a.minutes - b.minutes ||
        a.first.departure.localeCompare(b.first.departure),
    )
    .slice(0, 3);
}
