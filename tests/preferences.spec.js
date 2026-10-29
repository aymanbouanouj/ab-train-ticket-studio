import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { renderPDF } from "./render-pdf.js";
import { messages } from "../src/i18n.js";

async function fits(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function translated(page, language) {
  const leftovers = await page.locator("main").evaluate(
    (main, { en, other }) => {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT),
        found = [];
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        if (en[text] && other[text] !== text) found.push(text);
      }
      return found;
    },
    { en: messages.en, other: messages[language] },
  );
  expect(leftovers).toEqual([]);
}

for (const language of ["en", "fr", "ar", "es"])
  for (const width of [390, 1440]) {
    test(`${language} at ${width}px: translated journey, themes, exports and saved history`, async ({
      page,
    }, info) => {
      const m = messages[language];
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await page.locator("#language").selectOption(language);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        language === "ar" ? "rtl" : "ltr",
      );
      await expect(page.locator(".topbar")).not.toContainText("Demo platform");
      await expect(page.locator(".footer-bottom")).toContainText(
        "Ayman Bounaouj",
      );
      await expect(
        page.locator('footer a[href="https://github.com/aymanbouanouj"]'),
      ).toBeVisible();
      if ((await page.locator("html").getAttribute("data-theme")) !== "light")
        await page.locator("#theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.reload();
      await expect(page.locator("#language")).toHaveValue(language);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await translated(page, language);
      await fits(page);
      await page.screenshot({
        path: info.outputPath("search-light.png"),
        fullPage: true,
      });
      await page.locator("#theme-toggle").click();
      await page.screenshot({
        path: info.outputPath("search-dark.png"),
        fullPage: true,
      });
      await page.locator('#search-form button[type="submit"]').click();
      await translated(page, language);
      await fits(page);
      await page.locator('[data-action="select-service"]').first().click();
      await translated(page, language);
      await fits(page);
      await page.locator(".seat:not([disabled])").first().click();
      await page.locator("#theme-toggle").click();
      await page.screenshot({
        path: info.outputPath("seats-light.png"),
        fullPage: true,
      });
      await page.locator('[data-action="seat-next"]').click();
      await translated(page, language);
      await page
        .locator("#passenger")
        .fill(language === "ar" ? "أيمن بونعوج" : "Ayman Bounaouj");
      await page.locator('#passenger-form button[type="submit"]').click();
      await translated(page, language);
      await fits(page);
      await page.locator("#demo-consent").check();
      await page.locator('[data-action="confirm"]').click();
      await expect(page.locator(".ticket-preview")).toContainText(
        m["SAMPLE — NOT VALID FOR TRAVEL"],
      );
      await translated(page, language);
      await fits(page);
      const before = await page.evaluate(() =>
        localStorage.getItem("ab-train-bookings-v1"),
      );
      const metrics = await page
        .locator(".ticket-preview svg")
        .evaluate((svg) =>
          [...svg.querySelectorAll("text")]
            .filter((t) => !t.closest("g[transform]"))
            .map((t) => {
              const b = t.getBBox();
              return {
                text: t.textContent,
                x: b.x,
                y: b.y,
                right: b.x + b.width,
                bottom: b.y + b.height,
              };
            }),
        );
      for (const b of metrics) {
        expect(b.x, b.text).toBeGreaterThanOrEqual(-1);
        expect(b.right, b.text).toBeLessThanOrEqual(1001);
        expect(b.bottom, b.text).toBeLessThanOrEqual(1500);
      }
      for (let i = 0; i < metrics.length; i++)
        for (let j = i + 1; j < metrics.length; j++) {
          const a = metrics[i],
            b = metrics[j];
          expect(
            Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1,
            `${a.text} / ${b.text}`,
          ).toBe(false);
        }
      await page.screenshot({
        path: info.outputPath("ticket-light.png"),
        fullPage: true,
      });
      if (width === 390) {
        const download = page.waitForEvent("download");
        await page.locator('[data-action="png"]').click();
        const file = await download;
        await file.saveAs(info.outputPath("ticket.png"));
        const image = PNG.sync.read(readFileSync(await file.path()));
        const qr = jsQR(
          new Uint8ClampedArray(image.data),
          image.width,
          image.height,
        );
        expect(JSON.parse(qr.data).ticket).toBe(JSON.parse(before)[0].ticketId);
        if (language === "en") {
          await page.locator("#theme-toggle").click();
          const darkDownload = page.waitForEvent("download");
          await page.locator('[data-action="png"]').click();
          const darkFile = await darkDownload;
          const darkImage = PNG.sync.read(readFileSync(await darkFile.path()));
          expect(darkImage.data.equals(image.data)).toBe(true);
        }
        if (language === "ar") {
          const pdfDownload = page.waitForEvent("download");
          await page.locator('[data-action="pdf"]').click();
          const pdf = await pdfDownload;
          await pdf.saveAs(info.outputPath("ticket.pdf"));
          const rendered = await renderPDF(readFileSync(await pdf.path()));
          const pixels = PNG.sync.read(rendered.png);
          expect(
            jsQR(
              new Uint8ClampedArray(pixels.data),
              pixels.width,
              pixels.height,
            )?.data,
          ).toBe(qr.data);
        }
      }
      if (await page.locator("#menu-toggle").isVisible())
        await page.locator("#menu-toggle").click();
      await page.locator("#tickets-link").click();
      await translated(page, language);
      await page.locator('[data-action="view"]').click();
      await page
        .locator("#language")
        .selectOption(language === "en" ? "fr" : "en");
      expect(
        await page.evaluate(() => localStorage.getItem("ab-train-bookings-v1")),
      ).toBe(before);
      await expect(page.locator(".ticket-preview")).toContainText(
        JSON.parse(before)[0].ticketId,
      );
      await page.locator('footer .footer-information a[href="#about"]').click();
      await translated(page, language === "en" ? "fr" : "en");
      await fits(page);
    });
  }

test("Switching language preserves drafts, chosen seat, consent and validation", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#from").fill("unfinished");
  await page.locator("#language").selectOption("fr");
  await expect(page.locator("#from")).toHaveValue("unfinished");
  await page.locator('.route-photo[data-to="marrakech"]').click();
  await page.locator('#search-form button[type="submit"]').click();
  await page.locator('[data-action="select-service"]').first().click();
  const seat = page.locator(".seat:not([disabled])").first();
  const number = await seat.getAttribute("data-seat");
  await seat.click();
  await page.locator("#language").selectOption("es");
  await expect(page.locator(`[data-seat="${number}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-action="seat-next"]').click();
  await page.locator("#passenger").fill("Draft Passenger");
  await page.locator("#language").selectOption("ar");
  await expect(page.locator("#passenger")).toHaveValue("Draft Passenger");
  await page.locator('#passenger-form button[type="submit"]').click();
  await page.locator('[data-action="confirm"]').click();
  await expect(page.locator("#confirm-error")).toContainText(
    messages.ar["Confirm that you understand this is a demo reservation."],
  );
  await page.locator("#language").selectOption("fr");
  await expect(page.locator("#confirm-error")).toContainText(
    messages.fr["Confirm that you understand this is a demo reservation."],
  );
  await page.locator("#demo-consent").check();
  await page.locator("#language").selectOption("en");
  await expect(page.locator("#demo-consent")).toBeChecked();
});

test("Narrow Arabic and French headers and blocked preference storage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/");
  for (const language of ["ar", "fr"]) {
    await page.locator("#language").selectOption(language);
    await fits(page);
    await expect(page.locator("#theme-toggle")).toBeVisible();
  }
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.locator("#theme-toggle").click();
  await expect(page.locator("#notice")).toContainText(
    messages.fr["Display preferences could not be saved on this device."],
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
