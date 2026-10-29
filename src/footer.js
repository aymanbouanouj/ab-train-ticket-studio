import { assetPath } from "./asset-path.js";
import { icon } from "./icons.js";
import { t } from "./i18n.js";
import { escape as e } from "./ticket.js";

export function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function footerHTML(config) {
  const external = (label, value, mark = "") => {
    const href = safeWebUrl(value);
    return href
      ? `<li><a href="${e(href)}" target="_blank" rel="noopener noreferrer">${mark ? `<span class="social-mark social-${mark}" aria-hidden="true"></span>` : ""}<span>${e(t(label))}</span><span class="external-arrow" aria-hidden="true">↗</span></a></li>`
      : "";
  };
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.email || "")
    ? config.email
    : "";
  const phone = /^\+?[\d ()-]{6,}$/.test(config.phone || "")
    ? config.phone
    : "";
  return `<div class="zellige-divider" aria-hidden="true"></div>
<div class="footer-grid">
<section class="footer-about"><div class="footer-brand" dir="ltr"><img class="logo-dark" src="${assetPath("brand/approved/ab-train-horizontal-dark.webp")}" width="244" height="56" alt="AB TRAIN"><img class="logo-light" src="${assetPath("brand/approved/ab-train-horizontal-light.webp")}" width="244" height="56" alt="AB TRAIN"></div><p>${t("A personal journey through Morocco, thoughtfully designed.")}</p><ul class="footer-socials" aria-label="${t("Connect")}">${external("GitHub", config.github, "github")}${external("LinkedIn", config.linkedin, "linkedin")}${external("Beacons", config.beacons)}${external("Blog", config.blog, "blogger")}</ul></section>
<section class="footer-navigation"><h2>${t("Navigation")}</h2><ul><li><a href="#home">${t("Plan a journey")}</a></li><li><a href="#tickets">${t("Saved journeys")}</a></li><li><a href="#about">${t("About")}</a></li></ul></section>
<section class="footer-information"><h2>${t("Information")}</h2><ul><li><a href="#about">${t("Data & demo information")}</a></li><li><a href="${assetPath("fidelity/credits.html")}">${t("Photo credits")}</a></li></ul><p class="footer-disclaimer">${t("Independent demonstration. No official railway affiliation. Services, schedules, fares and tickets are simulated; not valid for travel.")}</p></section>
<section class="footer-owner"><h2>${t("About AB TRAIN")}</h2><p class="creator">${e(t("Designed and developed by {name}.", { name: config.fullName }))}</p><span class="footer-location">${icon("pin")}${e(t(config.location))}</span></section>
<section class="footer-contact" id="contact"><h2>${t("Contact")}</h2>${email ? `<p>${t("Get in touch by email.")}</p>` : ""}${email ? `<a class="footer-email-action" href="mailto:${e(email)}"><span dir="ltr">${e(email)}</span><span class="email-arrow" aria-hidden="true">→</span><span class="sr-only">${t("Open your email app")}</span></a>` : ""}<ul>${!email && safeWebUrl(config.beacons) ? `<li><a href="${e(safeWebUrl(config.beacons))}">${t("Beacons")}</a></li>` : ""}${phone ? `<li><a href="tel:${phone.replace(/[^+\d]/g, "")}" dir="ltr">${e(phone)}</a></li>` : ""}${external("WhatsApp", config.whatsapp)}${external("Website", config.website)}</ul></section>
</div><div class="footer-bottom"><p>${e(t("© 2026 {name}. All rights reserved.", { name: config.fullName }))}</p><a href="#about">${t("Data & demo information")}</a></div>`;
}
