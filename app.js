import { homeHTML } from "./src/homepage.js";
import {
  t,
  getLanguage,
  setLanguage,
  locale,
  displayDuration,
  displayDate,
  displayPrice,
  readPreference,
  savePreference,
  THEME_KEY,
} from "./src/i18n.js";
import { siteConfig } from "./src/site-config.js";
import { icon } from "./src/icons.js";
import { footerHTML } from "./src/footer.js";
import {
  searchStations,
  getLocation,
  getStation,
  loadGeography,
  locationDescription,
  displayLocationName,
  officialCities,
} from "./src/locations.js";
import {
  CLASSES,
  today,
  searchServices,
  searchConnections,
  validateSearch,
  fare,
  availableCount,
  seatStatus,
  validatePassenger,
  createBooking,
} from "./src/booking.js";
import { loadBookings, saveBookings, STORAGE_KEY } from "./src/storage.js";
import {
  ticketSVG,
  pngBlob,
  pdfBlob,
  downloadBlob,
  readableQR,
  escape as e,
} from "./src/ticket.js";
import meta from "./data/geography-meta.json";

const main = document.querySelector("main"),
  notice = document.querySelector("#notice");
let loaded = loadBookings(),
  bookings = loaded.bookings;
let qrResizeObserver;
let currentView = "booking";
let state = {
  step: 0,
  from: "rabat-ville",
  to: "fes",
  date: today(),
  services: [],
  service: null,
  travelClass: "second",
  coach: 3,
  seat: null,
  passenger: "",
  ticket: null,
};
const arrow =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
const trainIcon =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="2" width="14" height="16" rx="4"/><path d="M5 8h14M5 13h14M8 18l-3 4m11-4 3 4M12 3v9"/></svg>';
function notify(message, error = false) {
  notice.dataset.message = message;
  notice.textContent = t(message);
  notice.classList.toggle("error", error);
}
function updateCount() {
  document.querySelector("#ticket-count").textContent = bookings.length;
}
function refreshSummary() {
  const element = main.querySelector(".summary");
  if (element) element.outerHTML = summary();
}
function pageFocus() {
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
const button = (label, action, kind = "primary", extra = "") =>
  `<button type="button" class="btn ${kind}" data-action="${action}" ${extra}>${label}</button>`;
function progress() {
  const labels = [
    t("Journey"),
    t("Train"),
    t("Seat"),
    t("Passenger"),
    t("Review"),
  ];
  return `<ol class="progress" aria-label="${t("Booking progress")}">${labels.map((s, i) => `<li ${i === state.step ? 'aria-current="step"' : ""} class="${i === state.step ? "current" : i < state.step ? "done" : ""}"><span>${i < state.step ? "✓" : i + 1}</span>${s}</li>`).join("")}</ol>`;
}
function arrivalNote(service) {
  return service.arrivalDayOffset
    ? '<small class="arrival-note">' +
        e(t("Arrives {date}", { date: displayDate(service.arrivalDate) })) +
        "</small>"
    : "";
}
function summary() {
  return `<aside class="summary" aria-label="${t("Journey summary")}"><p class="micro">${t("Your journey")}</p><div class="route-line"><span>${e(displayLocationName(getLocation(state.from)))}</span>${arrow}<span>${e(displayLocationName(getLocation(state.to)))}</span></div><p class="muted">${e(displayDate(state.date))} · ${t("1 passenger")}</p>${state.service ? `<hr><dl><div><dt>${t("Simulated service")}</dt><dd>${e(state.service.number)}</dd></div><div><dt>${t("Departure / arrival")}</dt><dd>${state.service.departure} / ${state.service.arrival}${arrivalNote(state.service)}</dd></div><div><dt>${t("Duration")}</dt><dd>${displayDuration(state.service.minutes)}</dd></div><div><dt>${t("Travel class")}</dt><dd>${t(CLASSES[state.travelClass].name)}</dd></div>${state.seat ? `<div><dt>${t("Coach / seat")}</dt><dd>${state.coach} / ${state.seat}</dd></div>` : ""}</dl><hr><div class="total"><span>${t("Total demo fare")}</span><strong>${displayPrice(fare(state.service, state.travelClass))}</strong></div>` : ""}<p class="fine">${t("No payment is taken. This reservation is saved only in this browser.")}</p></aside>`;
}

function shell(content) {
  main.className = "";
  currentView = "booking";
  qrResizeObserver?.disconnect();
  main.innerHTML = `<div class="booking-header ${state.step === 0 ? "journey-hero" : ""}"><div class="hero-copy"><p class="micro">${t("Plan a little escape")}</p><h1>${[t("Your next journey starts here."), t("Find your way."), t("A seat for your journey."), t("Who’s traveling?"), t("One last look.")][state.step]}</h1><p class="muted">${t("Explore Morocco. Create your own sample ticket.")}<br> ${t("Five simple steps, no account needed.")}</p></div></div>${progress()}<div class="workspace ${state.step === 0 ? "search-workspace" : ""}"><section class="booking-content">${content}</section>${summary()}</div>`;
  updateCount();
}
function locationField(id, label, value) {
  const loc = getStation(value);
  if (!loc?.serviceable) state[id] = null;
  return `<div class="location-field"><label for="${id}">${label}</label><input type="search" id="${id}" name="${id}" value="${e(displayLocationName(loc))}" placeholder="${t("Search a station")}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-options" aria-describedby="${id}-hint search-error"><div id="${id}-options" class="location-options" role="listbox" aria-label="${e(t("{label} locations", { label }))}" hidden></div><span id="${id}-results-status" class="sr-only" role="status" aria-live="polite"></span><p id="${id}-hint" class="field-hint">${loc?.serviceable ? t("Railway station · simulated services") : t("Choose a station from the suggestions.")}</p></div>`;
}
function connectionSuggestions() {
  const connections = searchConnections(state.from, state.to, state.date);
  if (!connections.length) return "";
  return (
    '<section class="connection-options"><h3>' +
    t("Possible demo connections") +
    '</h3><p class="muted">' +
    t(
      "Two separate bookings. Connection times are simulated, not guaranteed.",
    ) +
    "</p>" +
    connections
      .map(
        (c) =>
          '<article class="connection-card"><strong>' +
          e(
            t("Change at {station}", {
              station: displayLocationName(getStation(c.via)),
            }),
          ) +
          "</strong><p>" +
          displayDuration(c.minutes) +
          " · " +
          e(t("Wait {duration}", { duration: displayDuration(c.wait) })) +
          "</p><ol><li>" +
          e(displayLocationName(getStation(c.first.from))) +
          " → " +
          e(displayLocationName(getStation(c.first.to))) +
          " · <bdi>" +
          c.first.departure +
          "–" +
          c.first.arrival +
          "</bdi></li><li>" +
          e(displayLocationName(getStation(c.second.from))) +
          " → " +
          e(displayLocationName(getStation(c.second.to))) +
          " · <bdi>" +
          c.second.departure +
          "–" +
          c.second.arrival +
          "</bdi> · " +
          displayDate(c.second.date) +
          '</li></ol><button class="btn secondary" data-from="' +
          c.first.from +
          '" data-to="' +
          c.first.to +
          '">' +
          t("Search first leg") +
          "</button></article>",
      )
      .join("") +
    "</section>"
  );
}
function renderSearch() {
  currentView = "booking";
  qrResizeObserver?.disconnect();
  main.className = "home-page";
  main.innerHTML = homeHTML({
    fromField: locationField("from", t("From"), state.from),
    toField: locationField("to", t("To"), state.to),
    date: state.date,
    progress: progress(),
    summary: summary(),
  });
  updateCount();
  bindLocations();
}
function bindLocations() {
  for (const id of ["from", "to"]) {
    const input = document.getElementById(id),
      box = document.getElementById(id + "-options");
    let options = [],
      active = -1,
      blurTimer,
      pendingArrows = 0,
      keyboardQueue = Promise.resolve();
    const close = () => {
      box.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    };
    const choose = (index) => {
      const loc = options[index];
      if (!loc || loc.kind !== "station" || !getStation(loc.id)?.serviceable)
        return;
      state[id] = loc.id;
      input.value = displayLocationName(loc);
      document.getElementById(id + "-hint").textContent = t(
        "Railway station · simulated services",
      );
      refreshSummary();
      close();
      input.focus();
    };
    const renderOptions = () => {
      const groups = new Map();
      options.forEach((p, i) => {
        const label = "Stations";
        if (!groups.has(label)) groups.set(label, []);
        groups
          .get(label)
          .push(
            `<div class="location-option" id="${id}-option-${i}" role="option" aria-selected="false" data-index="${i}"><span>${e(displayLocationName(p))}</span><small>${e(locationDescription(p))}</small></div>`,
          );
      });
      box.innerHTML =
        [...groups]
          .map(
            ([label, items]) =>
              `<div role="group" aria-label="${e(t(label))}"><div class="location-group-label" aria-hidden="true">${e(t(label))}</div>${items.join("")}</div>`,
          )
          .join("") || `<p class="no-options">${t("No matching stations")}</p>`;
    };
    const show = async () => {
      clearTimeout(blurTimer);
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
      const update = () => {
        const selectedId = options[active]?.id;
        const selectedStation = getStation(state[id]);
        const query =
          selectedStation?.serviceable &&
          input.value === displayLocationName(selectedStation)
            ? ""
            : input.value;
        const matches = searchStations(query);
        options = matches;
        active = selectedId
          ? options.findIndex((p) => p.id === selectedId)
          : -1;
        renderOptions();
        if (active >= 0) {
          input.setAttribute("aria-activedescendant", id + "-option-" + active);
          box
            .querySelector('[data-index="' + active + '"]')
            .setAttribute("aria-selected", "true");
        } else input.removeAttribute("aria-activedescendant");
        document.getElementById(id + "-results-status").textContent =
          options.length
            ? t("{count} stations found. Use arrow keys to choose.", {
                count: options.length,
              })
            : t("No matching stations");
      };
      update();
    };
    input.addEventListener("focus", show);
    input.addEventListener("input", () => {
      state[id] = null;
      options = [];
      active = -1;
      input.removeAttribute("aria-activedescendant");
      document.getElementById(id + "-hint").textContent = t(
        "Choose a station from the suggestions.",
      );
      refreshSummary();
      show();
    });
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Escape") {
        close();
        event.preventDefault();
      }
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        const requestedQuery = input.value;
        pendingArrows++;
        // Serialize rapid arrow presses before confirming a station.
        keyboardQueue = keyboardQueue
          .then(async () => {
            if (box.hidden || !options.length) await show();
            if (!options.length || box.hidden || requestedQuery !== input.value)
              return;
            active =
              active < 0
                ? event.key === "ArrowDown"
                  ? 0
                  : options.length - 1
                : (active +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    options.length) %
                  options.length;
            for (const opt of box.querySelectorAll("[role=option]"))
              opt.setAttribute(
                "aria-selected",
                String(+opt.dataset.index === active),
              );
            input.setAttribute(
              "aria-activedescendant",
              `${id}-option-${active}`,
            );
            document
              .getElementById(`${id}-option-${active}`)
              .scrollIntoView({ block: "nearest" });
          })
          .finally(() => pendingArrows--);
      }
      if (
        event.key === "Enter" &&
        !box.hidden &&
        (active >= 0 || pendingArrows > 0)
      ) {
        event.preventDefault();
        await keyboardQueue;
        if (!box.hidden && active >= 0) choose(active);
      }
    });
    box.addEventListener("mousedown", (event) => event.preventDefault());
    box.addEventListener("click", (event) => {
      const opt = event.target.closest("[data-index]");
      if (opt) choose(+opt.dataset.index);
    });
    input.addEventListener("blur", () => {
      blurTimer = setTimeout(close, 120);
    });
  }
}
function renderTrains() {
  shell(
    `<div class="section-heading"><div><h2>${t("Available Trains")}</h2><p class="muted">${t("{count} simulated services · Casablanca local time", { count: state.services.length })}</p></div>${button(t("Edit journey"), "back", "ghost")}</div>${state.services.length ? `<div class="services">${state.services.map((s, i) => `<article class="service"><div class="service-top"><span class="service-name">${trainIcon}${e(t(s.name))}</span><span class="muted">${s.number} · ${t("Simulated")}</span></div><div class="service-journey"><div><strong>${s.departure}</strong><small>${e(displayLocationName(getStation(s.from)))}</small></div><div class="journey-track"><span>${displayDuration(s.minutes)}</span><i></i><small>${t("Direct demo route")}</small></div><div><strong>${s.arrival}</strong>${arrivalNote(s)}<small>${e(displayLocationName(getStation(s.to)))}</small></div></div><div class="service-bottom"><span class="muted">${t("{count} second-class seats", { count: availableCount(s, "second", bookings) })}<br>${t("First & Second Class")}</span><div><span class="fare">${displayPrice(fare(s, "second"))}</span><small class="muted">${t("from · demo fare")}</small></div>${button(t("Select Train"), "select-service", "primary", `data-index="${i}"`)}</div></article>`).join("")}</div>` : `<div class="empty"><h3>${t("No supported demo service")}</h3><p>${!getStation(state.from) || !getStation(state.to) ? t("One of your locations is a city or locality, rather than a supported railway station. A geographic listing does not imply railway service.") : t("These stations do not share a direct demo route. Where possible, separate connecting journeys are suggested below.")}</p>${button(t("Choose another journey"), "back")}</div>${getStation(state.from) && getStation(state.to) ? connectionSuggestions() : ""}`}`,
  );
}
function renderSeats() {
  const cfg = CLASSES[state.travelClass];
  shell(
    `<div class="section-heading"><h2>${t("Select Class & Seat")}</h2>${button(t("Back to trains"), "back", "ghost")}</div><fieldset class="class-options"><legend>${t("Select Class")}</legend>${Object.entries(
      CLASSES,
    )
      .map(
        ([key, c]) =>
          `<label class="class-choice ${state.travelClass === key ? "selected" : ""}"><input type="radio" name="travelClass" value="${key}" ${state.travelClass === key ? "checked" : ""}><span><strong>${t(c.name)}</strong><small>${key === "first" ? t("A quieter, 24-seat coach") : t("Comfortable, 32-seat coach")}</small></span><b>${displayPrice(fare(state.service, key))}</b></label>`,
      )
      .join(
        "",
      )}</fieldset><div class="coach-header"><div><label for="coach">${t("Coach")}</label><select id="coach">${cfg.coaches.map((n) => `<option value="${n}" ${state.coach === n ? "selected" : ""}>${t("Coach")} ${n}</option>`).join("")}</select></div><div class="seat-legend"><span>${t("□ Available")}</span><span class="accent">${t("■ Selected")}</span><span>${t("× Unavailable")}</span></div></div><div class="coach"><p class="muted">${t("Front of coach {coach}", { coach: state.coach })}</p><div class="seat-grid">${Array.from(
      { length: cfg.seats },
      (_, i) => {
        const seat = i + 1,
          status = seatStatus(
            state.service,
            state.travelClass,
            state.coach,
            seat,
            bookings,
          );
        return `<button class="seat ${seat === state.seat ? "selected" : ""}" data-seat="${seat}" ${status !== "available" ? "disabled" : ""} aria-label="${t("Seat {seat}, {status}", { seat, status: t(status) })}" aria-pressed="${seat === state.seat}">${String(seat).padStart(2, "0")}${status !== "available" ? "<small>×</small>" : ""}</button>`;
      },
    ).join(
      "",
    )}</div><p class="fine">${t("Seats marked × are simulated unavailable or already booked in this browser.")}</p></div><p id="seat-error" class="form-error" role="alert"></p><div class="step-actions"><span class="muted">${state.seat ? t("Coach {coach} · Seat {seat}", { coach: state.coach, seat: state.seat }) : t("Choose an available seat to continue.")}</span>${button(t("Passenger Details") + " " + arrow, "seat-next")}</div>`,
  );
}
function renderPassenger() {
  shell(
    `<div class="section-heading"><h2>${t("Passenger Details")}</h2>${button(t("Back to seat"), "back", "ghost")}</div><p class="muted">${t("Just your name. No ID, email or payment details needed.")}</p><form id="passenger-form" novalidate><label for="passenger">${t("Full name")}</label><input id="passenger" name="passenger" autocomplete="name" value="${e(state.passenger)}" maxlength="100" required aria-describedby="passenger-hint passenger-error"><p id="passenger-hint" class="field-hint">${t("Use the name you would like printed on your sample ticket.")}</p><p id="passenger-error" class="form-error" role="alert"></p><div class="step-actions">${button(t("Back"), "back", "ghost")}<button class="btn primary" type="submit">${t("Booking Summary")} ${arrow}</button></div></form>`,
  );
}
function renderReview() {
  shell(
    `<div class="section-heading"><h2>${t("Booking Summary")}</h2>${button(t("Edit passenger"), "back", "ghost")}</div><div class="review-passenger">${trainIcon}<div><span class="muted">${t("Passenger")}</span><h3>${e(state.passenger)}</h3></div></div><dl class="review-details"><div><dt>${t("From")}</dt><dd>${e(displayLocationName(getStation(state.from)))} · ${state.service.departure}</dd></div><div><dt>${t("To")}</dt><dd>${e(displayLocationName(getStation(state.to)))} · ${state.service.arrival}${arrivalNote(state.service)}</dd></div><div><dt>${t("Travel date")}</dt><dd>${displayDate(state.date)}</dd></div><div><dt>${t("Class & seat")}</dt><dd>${t(CLASSES[state.travelClass].name)} · ${t("Coach {coach} · Seat {seat}", { coach: state.coach, seat: state.seat })}</dd></div></dl><label class="consent"><input id="demo-consent" type="checkbox" aria-describedby="confirm-error"><span>${t("I understand this is a demo reservation. The ticket is not valid for travel and no payment is taken.")}</span></label><p id="confirm-error" class="form-error" role="alert"></p><div class="step-actions">${button(t("Edit seat"), "edit-seat", "ghost")}${button(t("Confirm Booking") + " " + arrow, "confirm")}</div>`,
  );
}
function renderTicket(b) {
  currentView = "ticket";
  main.className = "";
  qrResizeObserver?.disconnect();
  state.ticket = b;
  main.innerHTML = `<div class="confirmation-header"><div><p class="micro">${t("Demo reservation confirmed")}</p><h1>${t("Your journey, on paper.")}</h1><p class="muted">${t("Saved in this browser. Ready to view, download or print.")}</p></div>${button(t("Book another journey"), "new", "ghost")}</div><div class="ticket-workspace"><section class="ticket-preview" aria-label="${t("Generated sample ticket")}">${ticketSVG(b)}</section><aside class="ticket-tools"><h2>${t("Your ticket is ready")}</h2><p class="muted">${e(b.passenger)}</p><p>${e(displayLocationName(getStation(b.service.from)))} ${arrow} ${e(displayLocationName(getStation(b.service.to)))}</p><p class="muted">${displayDate(b.date)} · ${b.service.departure}${arrivalNote(b.service)}</p><div class="export-actions">${button(t("Download Ticket · PNG"), "png")}${button(t("Download Ticket · PDF"), "pdf", "secondary")}${button(t("Print Ticket"), "print", "secondary")}</div><p class="fine">${t("PNG: 2000 × 3000 pixels. PDF: A4 with margins. The QR contains the matching demo booking data.")}</p><div class="demo-note"><div><strong>${t("Sample. Not valid for travel.")}</strong><p>${t("This is not an official reservation, proof of payment or railway-authorized QR code.")}</p></div></div>${button(t("My Tickets"), "history", "ghost")}</aside></div>`;
  main
    .querySelector(".export-actions")
    .insertAdjacentHTML(
      "beforebegin",
      `<details class="ticket-details"><summary>${t("Show QR code & ticket details")}</summary><div class="readable-qr">${readableQR(b)}</div><dl><div><dt>${t("Train")}</dt><dd>${e(b.service.number)}</dd></div><div><dt>${t("Class")}</dt><dd>${t(CLASSES[b.travelClass].name)}</dd></div><div><dt>${t("Coach / seat")}</dt><dd>${b.coach} / ${b.seat}</dd></div><div><dt>${t("Demo fare")}</dt><dd>${displayPrice(b.price)}</dd></div><div><dt>${t("Ticket number")}</dt><dd>${b.ticketId}</dd></div><div><dt>${t("Booking reference")}</dt><dd>${b.reference}</dd></div></dl></details>`,
    );
  const details = main.querySelector(".ticket-details"),
    qrElement = details.querySelector(".readable-qr svg");
  const sizeQR = () => {
    const modules = qrElement.viewBox.baseVal.width;
    const size =
      modules *
      Math.max(1, Math.floor(Math.min(details.clientWidth, 440) / modules));
    qrElement.style.width = `${size}px`;
    qrElement.style.height = `${size}px`;
  };
  details.addEventListener("toggle", sizeQR);
  qrResizeObserver = new ResizeObserver(sizeQR);
  qrResizeObserver.observe(details);
  updateCount();
}
function renderHistory() {
  currentView = "history";
  main.className = "";
  qrResizeObserver?.disconnect();
  main.innerHTML = `<div class="booking-header"><div><p class="micro">${t("Your local collection")}</p><h1>${t("My Tickets")}</h1><p class="muted">${t("Demo bookings stored in this browser. Clearing browser data removes them.")}</p></div>${button(t("Book a journey"), "new")}</div><p class="form-error">${e(t(loaded.warning))}</p>${
    bookings.length
      ? `<div class="history-list">${bookings
          .slice()
          .reverse()
          .map(
            (b) =>
              `<article class="history-item"><div class="history-mark">${trainIcon}</div><div class="history-info"><h2>${e(displayLocationName(getStation(b.service.from)))} ${arrow} ${e(displayLocationName(getStation(b.service.to)))}</h2><p>${e(b.passenger)} · ${displayDate(b.date)} · ${b.service.departure}</p><small class="muted">${t(CLASSES[b.travelClass].name)} · ${t("Coach {coach} · Seat {seat}", { coach: b.coach, seat: b.seat })} · ${displayPrice(b.price)}</small><small class="reference">${b.reference}</small></div><div class="history-actions">${button(t("View Ticket"), "view", "primary", `data-id="${b.ticketId}"`)}${button("PNG", "history-png", "secondary", `data-id="${b.ticketId}"`)}${button("PDF", "history-pdf", "secondary", `data-id="${b.ticketId}"`)}${button(t("Print"), "history-print", "ghost", `data-id="${b.ticketId}"`)}${button(t("Delete"), "delete", "ghost", `data-id="${b.ticketId}"`)}</div></article>`,
          )
          .join("")}</div>`
      : `<div class="empty"><h2>${t("Your first journey is waiting.")}</h2><p>${t("Confirm a demo reservation and your sample ticket will appear here.")}</p>${button(t("Search Trains"), "new")}</div>`
  }`;
  updateCount();
}
function renderAbout() {
  currentView = "about";
  main.className = "";
  qrResizeObserver?.disconnect();
  main.innerHTML = `<div class="about"><h1>${t("A personal project, thoughtfully built.")}</h1><p>${t("AB TRAIN is an independent booking simulation by Ayman Bounaouj. Services, schedules, distances, fares and availability are simulated. No payment is requested. This project is not affiliated with ONCF.")}</p><h2>${t("Locations and railway stations")}</h2><p>${t(
    "{count} GeoNames localities (CC BY 4.0), retrieved {date}, supplement {cities} HCP urban communes and city aggregates. Commune boundaries and named localities are different geographic entities. Only explicitly mapped stations can be selected for a simulated journey.",
    {
      count: meta.count.toLocaleString(locale()),
      cities: officialCities.length.toLocaleString(locale()),
      date: meta.retrieved,
    },
  )}</p><p><a href="https://www.geonames.org/">GeoNames</a> · <a href="https://www.hcp.ma/file/242342/">HCP RGPH 2024</a></p><p>${t("Station names follow dated ONCF references. Four selected corridors are simulated; missing demo coverage does not imply absence of real service.")}</p><p><a href="https://www.oncf.ma/fr/Voyageurs/Relation-client/Telechargements">ONCF Al Atlas</a> · <a href="https://www.oncf.ma/en/Al-boraq">ONCF Al Boraq</a></p><h2>${t("Prices and availability")}</h2><p>${t("Second Class: 0.35 MAD per simulated kilometre, minimum 30 MAD, rounded up to 5 MAD. First Class applies a 1.6 multiplier before rounding. Seats are reserved only in this browser.")}</p><h2>${t("Your data")}</h2><p>${t("Only your passenger name and booking details are stored on this device. QR codes and exports include these details. Clearing browser data removes saved tickets; deleting a booking releases its local seat.")}</p>${button(t("Search Trains"), "new")}</div>`;
}
function render() {
  [renderSearch, renderTrains, renderSeats, renderPassenger, renderReview][
    state.step
  ]();
}
function showError(id, error, field) {
  const el = document.getElementById(id);
  el.dataset.message = error.message;
  el.textContent = t(error.message);
  if (field) {
    field.setAttribute("aria-invalid", "true");
    field.focus();
  }
}
async function confirm() {
  const consent = document.getElementById("demo-consent");
  if (!consent.checked) {
    showError(
      "confirm-error",
      new Error("Confirm that you understand this is a demo reservation."),
      consent,
    );
    return;
  }
  const target = main.querySelector('[data-action="confirm"]');
  target.disabled = true;
  target.textContent = t("Saving demo booking…");
  try {
    const transact = () => {
      const latest = loadBookings();
      if (latest.warning)
        throw new Error(
          "Saved ticket storage needs attention. Open My Tickets and export existing tickets before repairing browser storage.",
        );
      const b = createBooking(state, latest.bookings);
      saveBookings([...latest.bookings, b]);
      bookings = [...latest.bookings, b];
      return b;
    };
    const b = navigator.locks
      ? await navigator.locks.request("ab-train-bookings", transact)
      : transact();
    renderTicket(b);
    pageFocus();
    notify(t("Demo reservation saved. Your ticket is not valid for travel."));
  } catch (err) {
    showError("confirm-error", err);
    target.disabled = false;
    target.innerHTML = t("Confirm Booking") + " " + arrow;
  }
}
async function exportTicket(b, type, target) {
  if (!b) return;
  target.disabled = true;
  const original = target.textContent;
  target.textContent = t("Preparing…");
  notify(t("Preparing {format} ticket…", { format: type.toUpperCase() }));
  try {
    const blob = await (type === "png" ? pngBlob(b) : pdfBlob(b));
    downloadBlob(blob, `${b.ticketId}-sample.${type}`);
    notify(t("{format} ticket downloaded.", { format: type.toUpperCase() }));
  } catch (err) {
    notify(err.message, true);
  } finally {
    target.disabled = false;
    target.textContent = original;
  }
}
function printTicket(b) {
  document.querySelector("#print-ticket").innerHTML = ticketSVG(b);
  window.print();
}
main.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "search-form") {
    state.date = document.getElementById("date").value;
    try {
      validateSearch(state.from, state.to, state.date);
      state.services = searchServices(state.from, state.to, state.date);
      state.service = null;
      state.seat = null;
      state.step = 1;
      render();
      pageFocus();
    } catch (err) {
      showError(
        "search-error",
        err,
        document.getElementById(
          !state.from ? "from" : !state.to ? "to" : "date",
        ),
      );
    }
  }
  if (event.target.id === "passenger-form") {
    try {
      state.passenger = validatePassenger(
        document.getElementById("passenger").value,
      );
      state.step = 4;
      render();
      pageFocus();
    } catch (err) {
      showError("passenger-error", err, document.getElementById("passenger"));
    }
  }
});
main.addEventListener("input", (event) => {
  if (event.target.id === "passenger") state.passenger = event.target.value;
  if (event.target.id === "date") {
    state.date = event.target.value;
    refreshSummary();
  }
  event.target.removeAttribute("aria-invalid");
});
main.addEventListener("change", (event) => {
  if (event.target.name === "travelClass") {
    state.travelClass = event.target.value;
    state.coach = CLASSES[state.travelClass].coaches[0];
    state.seat = null;
    renderSeats();
    main.querySelector(`input[value="${state.travelClass}"]`).focus();
  }
  if (event.target.id === "coach") {
    state.coach = +event.target.value;
    state.seat = null;
    renderSeats();
    document.getElementById("coach").focus();
  }
});
main.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.from) {
    state.step = 0;
    state.service = null;
    state.seat = null;
    state.from = target.dataset.from;
    state.to = target.dataset.to;
    renderSearch();
    pageFocus();
    document.getElementById("from").focus();
    return;
  }
  if (target.dataset.seat) {
    state.seat = +target.dataset.seat;
    renderSeats();
    main.querySelector(`[data-seat="${state.seat}"]`).focus();
    return;
  }
  const action = target.dataset.action,
    b = bookings.find((b) => b.ticketId === target.dataset.id);
  switch (action) {
    case "swap":
      [state.from, state.to] = [state.to, state.from];
      renderSearch();
      break;
    case "back":
      state.step = Math.max(0, state.step - 1);
      render();
      pageFocus();
      break;
    case "select-service":
      state.service = state.services[+target.dataset.index];
      state.travelClass = "second";
      state.coach = 3;
      state.seat = null;
      state.step = 2;
      render();
      pageFocus();
      break;
    case "seat-next":
      if (!state.seat)
        showError("seat-error", new Error("Choose an available seat."));
      else {
        state.step = 3;
        render();
        pageFocus();
      }
      break;
    case "edit-seat":
      state.step = 2;
      render();
      pageFocus();
      break;
    case "confirm":
      await confirm();
      break;
    case "new":
      state.step = 0;
      state.service = null;
      state.seat = null;
      state.ticket = null;
      location.hash = "home";
      render();
      pageFocus();
      break;
    case "history":
      location.hash = "tickets";
      renderHistory();
      pageFocus();
      break;
    case "view":
      renderTicket(b);
      pageFocus();
      break;
    case "png":
    case "pdf":
      await exportTicket(state.ticket, action, target);
      break;
    case "history-png":
    case "history-pdf":
      await exportTicket(b, action.split("-")[1], target);
      break;
    case "print":
      printTicket(state.ticket);
      break;
    case "history-print":
      printTicket(b);
      break;
    case "delete":
      try {
        const remove = () => {
          const latest = loadBookings();
          if (latest.warning)
            throw new Error(
              "Cannot modify damaged storage. Export readable tickets before repairing browser storage.",
            );
          const remaining = latest.bookings.filter(
            (x) => x.ticketId !== b.ticketId,
          );
          saveBookings(remaining);
          bookings = remaining;
        };
        if (navigator.locks)
          await navigator.locks.request("ab-train-bookings", remove);
        else remove();
        renderHistory();
        notify(t("Local demo booking deleted. The seat is available again."));
      } catch (err) {
        notify(err.message, true);
      }
      break;
  }
});
function route() {
  if (location.hash === "#main" && main.childElementCount) return;
  syncCurrentPage();
  notify("");
  if (location.hash === "#tickets") renderHistory();
  else if (location.hash === "#about") renderAbout();
  else {
    state.step = 0;
    renderSearch();
  }
}
function syncCurrentPage() {
  const route = ["#tickets", "#about"].includes(location.hash)
    ? location.hash
    : "#home";
  document.querySelectorAll("#primary-navigation a").forEach((link) => {
    if (link.hash === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  setNavigation(false);
  pageFocus();
});
window.addEventListener("hashchange", route);
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    loaded = loadBookings();
    bookings = loaded.bookings;
    updateCount();
    if (loaded.warning) notify(loaded.warning, true);
    if (currentView === "history") renderHistory();
    else if (currentView === "booking" && state.step === 2) renderSeats();
  }
});
document.querySelectorAll(".topbar a").forEach((link) =>
  link.addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    setNavigation(false);
    if (location.hash !== link.hash) location.hash = link.hash;
    else route();
    pageFocus();
  }),
);
const menu = document.getElementById("menu-toggle");
const navigation = document.getElementById("primary-navigation");
const mobileNavigation = matchMedia("(max-width: 760px)");
function setNavigation(open, returnFocus = false) {
  menu.setAttribute("aria-expanded", String(open));
  navigation.dataset.open = String(open);
  syncNavigation();
  if (returnFocus) menu.focus();
}
function syncNavigation() {
  const open = menu.getAttribute("aria-expanded") === "true";
  navigation.inert = mobileNavigation.matches && !open;
  menu.setAttribute(
    "aria-label",
    t(open ? "Close navigation" : "Open navigation"),
  );
}
menu.addEventListener("click", () =>
  setNavigation(menu.getAttribute("aria-expanded") !== "true"),
);
mobileNavigation.addEventListener("change", () => setNavigation(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true")
    setNavigation(false, true);
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".topbar")) setNavigation(false);
});
document.querySelector(".topbar").addEventListener("focusout", (event) => {
  // Focusout precedes focusin: activeElement can briefly be body here.
  if (event.relatedTarget && !event.relatedTarget.closest(".topbar"))
    setNavigation(false);
});
let theme = readPreference(THEME_KEY, "light") === "dark" ? "dark" : "light";
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content =
    theme === "light" ? "#f6f5f9" : "#101014";
  const control = document.getElementById("theme-toggle");
  control.setAttribute(
    "aria-label",
    t(theme === "dark" ? "Switch to light mode" : "Switch to dark mode"),
  );
  control.setAttribute("title", control.getAttribute("aria-label"));
  control.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${theme === "dark" ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>' : '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>'}</svg>`;
}
function renderChrome() {
  const lang = getLanguage();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = `AB TRAIN — ${t("Train Booking & Ticket Studio")}`;
  document.querySelector(".skip-link").textContent = t("Skip to content");
  document
    .querySelector(".topbar .brand")
    .setAttribute("aria-label", t("AB TRAIN Home"));
  document
    .querySelector(".topbar nav")
    .setAttribute("aria-label", t("Main navigation"));
  for (const [id, key] of [
    ["home-link", "Home"],
    ["about-link", "About"],
    ["tickets-label", "My Tickets"],
    ["brand-tagline", "Train Booking & Ticket Studio"],
    ["language-label", "Language"],
  ])
    document.getElementById(id).textContent = t(key);
  document
    .getElementById("home-link")
    .insertAdjacentHTML("afterbegin", icon("home"));
  document.getElementById("tickets-link").querySelector(".ui-icon")?.remove();
  document
    .getElementById("tickets-link")
    .insertAdjacentHTML("afterbegin", icon("ticket"));
  document.getElementById("language").value = lang;
  document.getElementById("site-footer").innerHTML = footerHTML(siteConfig);
  syncNavigation();
  syncCurrentPage();
  applyTheme();
}
document.getElementById("theme-toggle").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  const saved = savePreference(THEME_KEY, theme);
  applyTheme();
  if (!saved)
    notify(t("Display preferences could not be saved on this device."), true);
});
document.getElementById("language").addEventListener("change", (event) => {
  const drafts = ["from", "to"].map((id) => ({
    id,
    value: document.getElementById(id)?.value,
    unselected: !state[id],
  }));
  const consent = document.getElementById("demo-consent")?.checked;
  const expanded = main.querySelector(".ticket-details")?.open;
  const errors = [...main.querySelectorAll(".form-error[data-message]")].map(
    (el) => ({ id: el.id, message: el.dataset.message }),
  );
  const saved = setLanguage(event.target.value);
  renderChrome();
  if (currentView === "ticket") renderTicket(state.ticket);
  else if (currentView === "history") renderHistory();
  else if (currentView === "about") renderAbout();
  else render();
  for (const draft of drafts)
    if (
      draft.unselected &&
      draft.value !== undefined &&
      document.getElementById(draft.id)
    )
      document.getElementById(draft.id).value = draft.value;
  if (consent && document.getElementById("demo-consent"))
    document.getElementById("demo-consent").checked = true;
  if (expanded && main.querySelector(".ticket-details"))
    main.querySelector(".ticket-details").open = true;
  for (const error of errors)
    if (document.getElementById(error.id)) showError(error.id, error);
  notify(
    saved ? "" : t("Display preferences could not be saved on this device."),
    !saved,
  );
});
renderChrome();
route();
if (loaded.warning) notify(loaded.warning, true);
loadGeography().catch((error) => notify(error.message, true));
