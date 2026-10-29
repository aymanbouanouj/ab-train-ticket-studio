import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Approved assets retain their bytes and geometry", async () => {
  for (const [source, target] of [
    ["lockups/ab-train-horizontal-dark.webp", "ab-train-horizontal-dark.webp"],
    [
      "lockups/ab-train-horizontal-light.webp",
      "ab-train-horizontal-light.webp",
    ],
    ["icons/favicon.ico", "favicon.ico"],
    ["social/og-image-1200x630.jpg", "og-image-1200x630.jpg"],
  ])
    expect(
      readFileSync("public/brand/approved/" + target).equals(
        readFileSync("AB-TRAIN-Logo-Pack/production/" + source),
      ),
    ).toBe(true);
  const module = await import("../src/brand.js");
  expect(module.brandPaths).toContain(
    readFileSync(
      "AB-TRAIN-Logo-Pack/production/mark/ab-monogram-transparent.webp",
    ).toString("base64"),
  );
});

test("Skip, current navigation and mobile transition preserve booking context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/");
  await expect(page.locator("#home-link")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.locator("#search-form button[type=submit]").click();
  await page
    .getByRole("button", { name: "Select Train", exact: true })
    .first()
    .click();
  await page.locator(".seat:not([disabled])").first().click();
  await page
    .getByRole("button", { name: "Passenger Details", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        document.querySelector("h1").getBoundingClientRect().top >=
        document.querySelector(".topbar").getBoundingClientRect().bottom,
    ),
  ).toBe(true);
  await page.locator("#passenger").fill("Ayman اختبار");
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#passenger")).toHaveValue("Ayman اختبار");
  await expect(page.locator("main")).toBeFocused();
  expect(await page.evaluate(() => scrollX)).toBe(0);
  await page.locator("#menu-toggle").click();
  await page.locator("#tickets-link").click();
  await expect(page.locator("#tickets-link")).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("Pending geography never blocks or expands the station-only selectors", async ({
  page,
}) => {
  let release;
  const held = new Promise((r) => (release = r));
  await page.route("**/*places*.json", async (route) => {
    await held;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/");
    await page.locator("#from").fill("Rabat");
    await expect(
      page
        .locator("#from-options [role=option]")
        .filter({ hasText: "Rabat Ville" }),
    ).toBeVisible();
    await page.locator("#from").press("ArrowDown");
    const selected = await page
      .locator("#from")
      .getAttribute("aria-activedescendant");
    release();
    await expect(page.locator("#from-options [role=option]")).toHaveCount(2);
    await expect(page.locator("#from-options")).not.toContainText(
      "HCP municipality",
    );
    await expect(page.locator("#from")).toHaveAttribute(
      "aria-activedescendant",
      selected,
    );
    await page.locator("#from").fill("");
    await expect(page.locator("#from-results-status")).toContainText(
      "22 stations found",
    );
  } finally {
    release();
  }
});

test("All required viewports keep actual controls on screen in four languages and both themes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [1920, 1080],
    [393, 852],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const lang of ["en", "fr", "ar", "es"]) {
      await page.locator("#language").selectOption(lang);
      for (const theme of ["dark", "light"]) {
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page.locator("#theme-toggle").click();
        await page.evaluate(() => scrollTo(0, 0));
        const measurements = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          x: scrollX,
          bounds: [
            ...document.querySelectorAll(
              ".topbar .brand,.topbar img:not([hidden]),.progress,#from,#to,#date,#search-form button[type=submit],.header-controls select,.header-controls button",
            ),
          ]
            .filter((e) => e.getBoundingClientRect().width)
            .map((e) => {
              const r = e.getBoundingClientRect();
              return { left: r.left, right: r.right };
            }),
        }));
        expect(measurements.scroll).toBeLessThanOrEqual(width);
        expect(measurements.x).toBe(0);
        for (const r of measurements.bounds) {
          expect(r.left).toBeGreaterThanOrEqual(0);
          expect(r.right).toBeLessThanOrEqual(width);
        }
        if (width === 393)
          expect(
            await page
              .locator("#search-form button[type=submit]")
              .evaluate((e) => e.getBoundingClientRect().bottom),
          ).toBeLessThanOrEqual(height);
        if ([393, 768, 1440].includes(width) && ["en", "ar"].includes(lang))
          await page.screenshot({
            path: info.outputPath(`${width}-${lang}-${theme}.png`),
            fullPage: true,
            animations: "disabled",
          });
      }
    }
  }
  expect(errors).toEqual([]);
});

test("Opening the content fragment directly still renders the booking screen", async ({
  page,
}) => {
  await page.goto("/#main");
  await expect(page.locator("#from")).toHaveValue("Rabat Ville");
});
