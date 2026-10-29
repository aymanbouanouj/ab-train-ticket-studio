import { isBooking } from "./booking.js";
export const STORAGE_KEY = "ab-train-bookings-v1";
// Rebuild allowlisted records: unknown fields (email, payment details, etc.) are not retained.
const clean = (b) => ({
  version: 1,
  ticketId: b.ticketId,
  reference: b.reference,
  passenger: b.passenger,
  service: {
    id: b.service.id,
    number: b.service.number,
    name: b.service.name,
    from: b.service.from,
    to: b.service.to,
    date: b.service.date,
    departure: b.service.departure,
    arrival: b.service.arrival,
    ...(b.service.arrivalDate
      ? {
          departureDate: b.service.departureDate,
          arrivalDate: b.service.arrivalDate,
          arrivalDayOffset: b.service.arrivalDayOffset,
        }
      : {}),
    minutes: b.service.minutes,
    distance: b.service.distance,
  },
  date: b.date,
  travelClass: b.travelClass,
  coach: b.coach,
  seat: b.seat,
  price: b.price,
  currency: b.currency,
  createdAt: b.createdAt,
  status: b.status,
});
export function loadBookings(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { bookings: [], warning: "" };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error();
    const ids = new Set(),
      refs = new Set(),
      seats = new Set();
    const bookings = parsed
      .filter((b) => {
        if (!isBooking(b)) return false;
        const key = `${b.service.id}|${b.date}|${b.coach}|${b.seat}`;
        if (ids.has(b.ticketId) || refs.has(b.reference) || seats.has(key))
          return false;
        ids.add(b.ticketId);
        refs.add(b.reference);
        seats.add(key);
        return true;
      })
      .map(clean);
    return {
      bookings,
      warning:
        bookings.length !== parsed.length
          ? "Some damaged or duplicate local tickets were ignored. Export any tickets you want to keep before changing browser storage."
          : "",
    };
  } catch {
    return {
      bookings: [],
      warning:
        "Saved tickets could not be read. Browser storage may be unavailable or damaged. Existing storage has not been overwritten.",
    };
  }
}
export function saveBookings(bookings, storage = localStorage) {
  if (!Array.isArray(bookings) || bookings.some((b) => !isBooking(b)))
    throw new Error("Invalid booking records.");
  for (const key of [
    (b) => b.ticketId,
    (b) => b.reference,
    (b) => `${b.service.id}|${b.date}|${b.coach}|${b.seat}`,
  ]) {
    if (new Set(bookings.map(key)).size !== bookings.length)
      throw new Error("Duplicate booking identifiers or seat reservations.");
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(bookings.map(clean)));
  } catch {
    throw new Error(
      "Could not save this booking. Browser storage is full or unavailable. Allow storage and try again.",
    );
  }
}
