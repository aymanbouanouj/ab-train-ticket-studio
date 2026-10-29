import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { renderPDF } from "./render-pdf.js";
async function choose(page, id, query, name) {
  await page.locator("#" + id).fill(query);
  await page
    .locator("#" + id + "-options [role=option]")
    .filter({ hasText: name })
    .first()
    .click();
}
test("Overnight airport booking survives reload and exports next-day QR in all languages", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/");
  await choose(page, "from", "Casa Voyageurs", "Casablanca Voyageurs");
  await choose(page, "to", "CMN", "Mohammed V Airport");
  await page.locator("#date").fill("2099-12-31");
  await page.locator("#search-form button[type=submit]").click();
  await expect(page.locator(".service").last()).toContainText(
    "Arrives 1 Jan 2100",
  );
  await page
    .getByRole("button", { name: "Select Train", exact: true })
    .last()
    .click();
  await page.locator(".seat:not([disabled])").first().click();
  await page
    .getByRole("button", { name: "Passenger Details", exact: true })
    .click();
  await page.locator("#passenger").fill("Ayman Bounaouj");
  await page
    .getByRole("button", { name: "Booking Summary", exact: true })
    .click();
  await expect(page.locator(".review-details")).toContainText(
    "Arrives 1 Jan 2100",
  );
  await page.locator("#demo-consent").check();
  await page
    .getByRole("button", { name: "Confirm Booking", exact: true })
    .click();
  // Confirmation is asynchronous when the browser provides navigator.locks.
  await expect(page.getByRole("heading", { name: "Your ticket is ready" })).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ab-train-bookings-v1"))[0],
  );
  expect(saved.service.arrivalDate).toBe("2100-01-01");
  for (const lang of ["en", "fr", "ar", "es"]) {
    await page.locator("#language").selectOption(lang);
    await expect(page.locator(".ticket-preview")).toContainText("2100");
    const payloads = [];
    for (const kind of ["png", "pdf"]) {
      const pending = page.waitForEvent("download");
      await page.locator('[data-action="' + kind + '"]').click();
      const download = await pending;
      await download.saveAs(info.outputPath("overnight-" + lang + "." + kind));
      const bytes = readFileSync(await download.path());
      const png = kind === "pdf" ? (await renderPDF(bytes)).png : bytes;
      if (kind === "pdf")
        writeFileSync(info.outputPath("overnight-" + lang + "-pdf.png"), png);
      const image = PNG.sync.read(png);
      const qr = jsQR(
        new Uint8ClampedArray(image.data),
        image.width,
        image.height,
      );
      expect(qr).not.toBeNull();
      const payload = JSON.parse(qr.data);
      expect(payload.arrivalDate).toBe("2100-01-01");
      expect(payload.validForTravel).toBe(false);
      expect(payload.ticket).toBe(saved.ticketId);
      payloads.push(qr.data);
    }
    expect(payloads[0]).toBe(payloads[1]);
  }
  await page.reload();
  await page.locator("#language").selectOption("en");
  await page.locator("#menu-toggle").click();
  await page.locator("#tickets-link").click();
  await page.getByRole("button", { name: "View Ticket", exact: true }).click();
  await expect(page.locator(".ticket-preview")).toContainText(
    "Arrives 1 Jan 2100",
  );
});
test("Connecting journeys remain explicit separate bookings and first-leg action resets the flow", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "from", "Fes", "Fes");
  await choose(page, "to", "CMN", "Mohammed V Airport");
  await page.locator("#search-form button[type=submit]").click();
  await expect(page.locator(".connection-options")).toContainText(
    "Two separate bookings",
  );
  await expect(page.locator(".connection-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Search first leg", exact: true })
    .first()
    .click();
  await expect(page.locator(".progress [aria-current=step]")).toContainText(
    "Journey",
  );
  await expect(page.locator("#from")).toHaveValue("Fes");
  await page.locator("#search-form button[type=submit]").click();
  await expect(page.locator(".service").first()).toBeVisible();
});
test("Short-screen CTA, keyboard dropdown and reduced-motion reflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const lang of ["en", "fr", "ar", "es"]) {
    await page.locator("#language").selectOption(lang);
    expect(
      await page
        .locator("#search-form button[type=submit]")
        .evaluate((e) => e.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(568);
    await page.locator("#from").fill("Rabat");
    await page.locator("#from").press("ArrowDown");
    await expect(page.locator("#from")).toHaveAttribute(
      "aria-activedescendant",
      /from-option/,
    );
    await page.locator("#from").press("Escape");
    await expect(page.locator("#from-options")).toBeHidden();
  }
  // Half-width reflow proxy for a 1440px display at 200% zoom; not native browser zoom.
  await page.setViewportSize({ width: 720, height: 450 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(720);
  const focus = page.locator("#from");
  await focus.focus();
  expect(
    await focus.evaluate((e) => getComputedStyle(e).outlineStyle),
  ).not.toBe("none");
});
