import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { renderPDF } from "./render-pdf.js";
import { PNG } from "pngjs";
import jsQR from "jsqr";
const key = "ab-train-bookings-v1";
async function choose(page, id, query, station) {
  await page.locator("#" + id).fill(query);
  await page
    .locator("#" + id + "-options")
    .getByRole("option")
    .filter({ hasText: station })
    .first()
    .click();
}
async function toSeat(page) {
  await page
    .getByRole("button", { name: "Search Trains", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Available Trains" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Select Train" }).first().click();
}
async function book(page, name = "Ayman Bounaouj") {
  await toSeat(page);
  const seat = page.locator(".seat:not([disabled])").first();
  const number = await seat.getAttribute("data-seat");
  await seat.click();
  await page.getByRole("button", { name: "Passenger Details" }).click();
  await page.getByLabel("Full name").fill(name);
  await page.getByRole("button", { name: "Booking Summary" }).click();
  await page.locator("#demo-consent").check();
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  await expect(
    page.getByRole("heading", { name: "Your ticket is ready" }),
  ).toBeVisible();
  return +number;
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("Desktop complete booking, QR, PNG, PDF, persistence, print and deletion", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("#from")).toHaveValue("Rabat Ville");
  await page.screenshot({
    path: info.outputPath("desktop-search.png"),
    fullPage: true,
  });
  const reserved = await book(page);
  await noOverflow(page);
  await expect(page.locator(".ticket-preview")).toContainText(
    "SAMPLE — NOT VALID FOR TRAVEL",
  );
  await page.screenshot({
    path: info.outputPath("desktop-ticket.png"),
    fullPage: true,
  });
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(saved).toHaveLength(1);
  const b = saved[0];
  expect(b.seat).toBe(reserved);
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Ticket · PNG" }).click();
  const png = await pngDownload;
  await png.saveAs(info.outputPath("ticket.png"));
  const image = PNG.sync.read(readFileSync(await png.path()));
  expect([image.width, image.height]).toEqual([2000, 3000]);
  const qr = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
  expect(qr).not.toBeNull();
  const payload = JSON.parse(qr.data);
  expect(payload.ticket).toBe(b.ticketId);
  expect(payload.booking).toBe(b.reference);
  expect(payload.passenger).toBe(b.passenger);
  expect(payload.seat).toBe(b.seat);
  expect(payload.validForTravel).toBe(false);
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Ticket · PDF" }).click();
  const pdf = await pdfDownload;
  await pdf.saveAs(info.outputPath("ticket.pdf"));
  const bytes = readFileSync(await pdf.path());
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(50000);
  expect(bytes.toString("latin1")).toContain("/Count 1");
  const rendered = await renderPDF(bytes);
  expect(rendered.pageCount).toBe(1);
  writeFileSync(info.outputPath("pdf-rendered.png"), rendered.png);
  const pdfImage = PNG.sync.read(rendered.png);
  const pdfQR = jsQR(
    new Uint8ClampedArray(pdfImage.data),
    pdfImage.width,
    pdfImage.height,
  );
  expect(pdfQR?.data).toBe(qr.data);
  await page.evaluate(() => {
    window.print = () => {
      window.__printed = true;
    };
  });
  await page.getByRole("button", { name: "Print Ticket" }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-ticket")).toBeVisible();
  await expect(page.locator("main")).toBeHidden();
  const printed = PNG.sync.read(
    await page.locator("#print-ticket svg").screenshot(),
  );
  for (const [x, y] of [
    [60, 80],
    [100, 1350],
    [950, 1440],
  ]) {
    const index =
      (Math.floor((y / 1500) * printed.height) * printed.width +
        Math.floor((x / 1000) * printed.width)) *
      4;
    expect(printed.data[index + 2]).toBeGreaterThan(
      printed.data[index + 1] * 2,
    );
    expect(printed.data[index]).toBeGreaterThan(20);
  }
  await page.screenshot({
    path: info.outputPath("print-layout.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.reload();
  await page.getByRole("link", { name: /My Tickets/ }).click();
  await page.getByRole("button", { name: "View Ticket" }).click();
  await expect(page.locator(".ticket-preview")).toContainText(b.ticketId);
  await expect(page.locator(".ticket-preview")).toContainText(b.reference);
  await page.getByRole("button", { name: "Book another journey" }).click();
  await toSeat(page);
  await expect(page.locator(`[data-seat="${reserved}"]`)).toBeDisabled();
  await page.getByRole("link", { name: /My Tickets/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Your first journey is waiting.")).toBeVisible();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).length, key),
  ).toBe(0);
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 768])
  test(`Complete responsive journey at ${width}px with long names and station text`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await choose(page, "from", "Casablanca Voyageurs", "Casablanca Voyageurs");
    await choose(page, "to", "Marrakech", "Marrakech");
    await expect(page.locator(".summary")).toContainText(
      "Casablanca Voyageurs",
    );
    await expect(page.locator(".summary")).toContainText("Marrakech");
    await noOverflow(page);
    await page.screenshot({
      path: info.outputPath(`search-${width}.png`),
      fullPage: true,
    });
    await toSeat(page);
    await page.getByRole("radio", { name: /First Class/ }).check();
    await expect(page.locator("#coach")).toHaveValue("1");
    await page.locator("#coach").selectOption("2");
    await page.locator(".seat:not([disabled])").first().click();
    await noOverflow(page);
    await page.screenshot({
      path: info.outputPath(`seat-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Passenger Details" }).click();
    const name = "W".repeat(100);
    await page.getByLabel("Full name").fill(name);
    await page.getByRole("button", { name: "Booking Summary" }).click();
    await noOverflow(page);
    await page.locator("#demo-consent").check();
    await page.getByRole("button", { name: "Confirm Booking" }).click();
    await expect(
      page.getByRole("heading", { name: "Your ticket is ready" }),
    ).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: info.outputPath(`ticket-${width}.png`),
      fullPage: true,
    });
    // SVG text bounds remain on canvas, and the passenger stays above ticket-number block.
    const metrics = await page.locator(".ticket-preview svg").evaluate((svg) =>
      Array.from(svg.querySelectorAll("text"))
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
    for (const m of metrics) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.right).toBeLessThanOrEqual(1000);
      expect(m.bottom).toBeLessThanOrEqual(1500);
    }
    for (let i = 0; i < metrics.length; i++)
      for (let j = i + 1; j < metrics.length; j++) {
        const a = metrics[i],
          b = metrics[j];
        const overlap =
          Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
        expect(overlap, `${a.text} overlaps ${b.text}`).toBe(false);
      }
    const names = metrics.filter((m) => /^W+$/.test(m.text));
    expect(names.map((n) => n.text).join("")).toBe(name);
    expect(Math.max(...names.map((n) => n.bottom))).toBeLessThan(580);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Ticket · PNG" }).click();
    const png = PNG.sync.read(readFileSync(await (await download).path()));
    const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(JSON.parse(qr.data).passenger).toBe(name);
    if (width === 320) {
      const pdfDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download Ticket · PDF" }).click();
      const rendered = await renderPDF(
        readFileSync(await (await pdfDownload).path()),
      );
      const pdfImage = PNG.sync.read(rendered.png);
      expect(
        jsQR(
          new Uint8ClampedArray(pdfImage.data),
          pdfImage.width,
          pdfImage.height,
        )?.data,
      ).toBe(qr.data);
      writeFileSync(info.outputPath("mobile-pdf-rendered.png"), rendered.png);
    }
    await page.locator(".ticket-details summary").click();
    await noOverflow(page);
    const expanded = PNG.sync.read(
      await page
        .locator(".readable-qr")
        .screenshot({ path: info.outputPath(`readable-qr-${width}.png`) }),
    );
    const expandedQR = jsQR(
      new Uint8ClampedArray(expanded.data),
      expanded.width,
      expanded.height,
    );
    expect(expandedQR?.data).toBe(qr.data);
  });

test("Keyboard search, validation and unsupported locations", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#from").fill("Fez");
  await page.locator("#from").press("ArrowDown");
  await page.locator("#from").press("Enter");
  await expect(page.locator("#from")).toHaveValue("Fes");
  await page
    .getByRole("button", { name: "Search Trains", exact: true })
    .click();
  await expect(page.locator("#search-error")).toContainText(
    "must be different",
  );
  await page.locator("#from").fill("Agadir");
  await expect(page.locator("#from-options [role=option]")).toHaveCount(0);
  await expect(page.locator("#from-options")).toHaveText(
    "No matching stations",
  );
  await page
    .getByRole("button", { name: "Search Trains", exact: true })
    .click();
  await expect(page.locator("#search-error")).toContainText("Choose both");
  await choose(page, "from", "Casa Port", "Casablanca Port");
  await choose(page, "to", "Tanger", "Tangier Ville");
  await page
    .getByRole("button", { name: "Search Trains", exact: true })
    .click();
  await expect(page.getByText("No supported demo service")).toBeVisible();
  await page.getByRole("button", { name: "Choose another journey" }).click();
  await choose(page, "to", "Fez", "Fes");
  await choose(page, "from", "Rabat Ville", "Rabat Ville");
  await toSeat(page);
  await page.getByRole("button", { name: "Passenger Details" }).click();
  await expect(page.locator("#seat-error")).toContainText(
    "Choose an available seat",
  );
  await page.locator(".seat:not([disabled])").first().click();
  await page.getByRole("button", { name: "Passenger Details" }).click();
  await page.getByLabel("Full name").fill("123");
  await page.getByRole("button", { name: "Booking Summary" }).click();
  await expect(page.locator("#passenger-error")).toContainText("Enter a name");
  await expect(page.getByLabel("Full name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Full name").fill("أحمد العلوي");
  await page.getByRole("button", { name: "Booking Summary" }).click();
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  await expect(page.locator("#confirm-error")).toContainText(
    "Confirm that you understand",
  );
});

test("Corrupt localStorage is reported without overwriting saved data", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((k) => localStorage.setItem(k, "{invalid"), key);
  await page.reload();
  await expect(page.locator("#notice")).toContainText("could not be read");
  await bookToReview(page);
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  await expect(page.locator("#confirm-error")).toContainText(
    "storage needs attention",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
    "{invalid",
  );
});
async function bookToReview(page) {
  await toSeat(page);
  await page.locator(".seat:not([disabled])").first().click();
  await page.getByRole("button", { name: "Passenger Details" }).click();
  await page.getByLabel("Full name").fill("Ayman Amrani");
  await page.getByRole("button", { name: "Booking Summary" }).click();
  await page.locator("#demo-consent").check();
}

test("Two tabs competing for one seat cannot both confirm", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const second = await context.newPage();
  await second.goto("/");
  await bookToReview(page);
  await bookToReview(second);
  await Promise.all([
    page.getByRole("button", { name: "Confirm Booking" }).click(),
    second.getByRole("button", { name: "Confirm Booking" }).click(),
  ]);
  const records = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(records).toHaveLength(1);
  const failures = await Promise.all([
    page.locator("#confirm-error").count(),
    second.locator("#confirm-error").count(),
  ]);
  expect(failures.reduce((a, b) => a + b)).toBe(1);
});

test("ArrowUp initially chooses the last option and Escape leaves selection unchanged", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#from").fill("Rabat");
  const options = page.locator("#from-options [role=option]");
  await expect(options.first()).toBeVisible();
  // The station list is available immediately, independently of geography.
  await expect(page.locator("#from-options .geography-loading")).toBeHidden();
  const last = await options.last().locator("span").textContent();
  await page.locator("#from").press("ArrowUp");
  await page.locator("#from").press("Enter");
  await expect(page.locator("#from")).toHaveValue(last);
  await page.locator("#from").fill("Dakhla");
  await expect(options).toHaveCount(0);
  await expect(page.locator("#from-options")).toHaveText(
    "No matching stations",
  );
  await page.locator("#from").press("Escape");
  await expect(page.locator("#from-options")).toBeHidden();
  await expect(page.locator("#from")).toHaveValue("Dakhla");
});

test("Storage updates preserve open tickets and failed deletion preserves usable history", async ({
  page,
  context,
}, info) => {
  await page.goto("/");
  await book(page, "أحمد العلوي");
  await page.getByRole("link", { name: /My Tickets/ }).click();
  await page.getByRole("button", { name: "View Ticket" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await other.evaluate(
    (k) => localStorage.setItem(k, localStorage.getItem(k) + " "),
    key,
  );
  await expect(
    page.getByRole("heading", { name: "Your ticket is ready" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /My Tickets/ }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator("#notice")).toContainText("Could not save");
  await page.getByRole("button", { name: "View Ticket" }).click();
  await expect(
    page.getByRole("heading", { name: "Your ticket is ready" }),
  ).toBeVisible();
  await expect(page.locator(".ticket-preview")).toContainText("أحمد العلوي");
  const arabic = page.locator('.ticket-preview text[direction="rtl"]');
  const bounds = await arabic.evaluate((t) => {
    const b = t.getBBox();
    return { x: b.x, right: b.x + b.width };
  });
  expect(bounds.x).toBeGreaterThanOrEqual(710);
  expect(bounds.right).toBeLessThanOrEqual(971);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Ticket · PNG" }).click();
  await (await download).saveAs(info.outputPath("arabic-ticket.png"));
  const png = PNG.sync.read(readFileSync(info.outputPath("arabic-ticket.png")));
  expect(
    JSON.parse(
      jsQR(new Uint8ClampedArray(png.data), png.width, png.height).data,
    ).passenger,
  ).toBe("أحمد العلوي");
});

test("A failed geographic asset still permits supported station search", async ({
  page,
}) => {
  await page.route("**/places-*.json", (route) => route.abort());
  await page.goto("/");
  await page.locator("#from").fill("Tanger");
  await expect(page.locator("#from-options [role=option]")).toHaveCount(1);
  await page.locator("#from").press("ArrowDown");
  await page.locator("#from").press("Enter");
  await expect(page.locator("#from")).toHaveValue("Tangier Ville");
});
