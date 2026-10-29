import { assetPath } from "./asset-path.js";
import { t, displayDuration } from "./i18n.js";
import { searchServices, today } from "./booking.js";
import { getStation, displayLocationName } from "./locations.js";
import { escape as e } from "./ticket.js";
import { icon } from "./icons.js";
export const featuredRoutes = [
  ["casa-voyageurs", "rabat-ville", "rabat", "Casablanca", "Rabat"],
  ["casa-voyageurs", "marrakech", "marrakech", "Casablanca", "Marrakech"],
  ["rabat-agdal", "tangier", "tangier", "Rabat", "Tangier"],
  ["marrakech", "fes", "fes", "Marrakech", "Fes"],
];
const arrow =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
const search =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg>';
export function homeHTML({ fromField, toField, date, progress, summary }) {
  const routes = featuredRoutes
    .map(([from, to, image, fromCity, toCity]) => {
      // The displayed duration comes from the unchanged deterministic booking engine.
      const service = searchServices(from, to, today())[0];
      return `<button class="route-photo" data-from="${from}" data-to="${to}" aria-label="${e(displayLocationName(getStation(from)))} → ${e(displayLocationName(getStation(to)))}"><img src="${assetPath(`fidelity/${image}.jpg`)}" alt="" width="640" height="400"><span class="route-photo-copy"><strong>${t(fromCity)} <bdi>→</bdi> ${t(toCity)}</strong><small>${t("Simulated")} · ${displayDuration(service.minutes)}</small></span><span class="route-photo-arrow">${arrow}</span></button>`;
    })
    .join("");
  return `<section class="fidelity-hero"><span class="hero-zellige" aria-hidden="true"></span><img class="fidelity-scene" src="${assetPath("fidelity/reference-hero.png")}" alt="" width="1672" height="941" fetchpriority="high"><div class="fidelity-hero-inner"><h1><span class="desktop-headline">${t("Explore")} <em>${t("Morocco")}</em><br>${t("by Train")}</span><span class="mobile-headline">${t("Your next journey starts here.").replace("Your next journey starts here.", "Your next<br>journey starts<br>here.")}</span></h1><p>${t("Discover Morocco. Imagine your next journey.")}<br> <span class="hero-secondary-copy">${t("Five simple steps, no account needed.")}</span></p></div><span class="fidelity-caption">${t("AI illustration · imagined Moroccan journey")}</span></section>
 <div class="home-layout"><section class="booking-content home-search" aria-label="${t("Search Trains")}"><form id="search-form" novalidate><div class="search-locations">${fromField.replace("<label", `${icon("pin")}<label`)}<button type="button" class="swap" aria-label="${t("Swap departure and arrival")}" data-action="swap">⇅</button>${toField.replace("<label", `${icon("pin")}<label`)}</div><div class="search-bottom"><div class="date-field"><label for="date">${t("Departure Date")}</label><input id="date" type="date" name="date" value="${date}" min="${today()}" required aria-describedby="search-error"></div><button class="btn primary" type="submit">${search}<span>${t("Search Trains")}</span>${arrow}</button></div><p id="search-error" class="form-error" role="alert"></p></form></section>
 <div class="home-progress">${progress}</div>
 <section class="home-routes"><div class="routes-title"><h2>${t("Popular routes")}</h2><a href="#about">${t("About demo routes")} ${arrow}</a></div><div class="route-photo-grid">${routes}</div></section>
 <aside class="home-info"><h2>${t("Your journey awaits")}</h2>${summary}<div class="home-trust"><span>${icon("ticket")}</span><div><strong>${t("Your own sample ticket")}</strong><p>${t("Timetables, prices and seats are simulated. Every ticket is clearly marked not valid for travel.")}</p></div></div></aside></div>`;
}
