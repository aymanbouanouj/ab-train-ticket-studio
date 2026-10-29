import { test, expect } from "@playwright/test";

test("Approved brand assets, contacts, responsive themes and Arabic layouts", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#date").fill("");
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page.locator("#search-error")).toContainText(
    "Choose today or a future travel date.",
  );
  await page.reload();
  for (const [width, height] of [
    [1440, 900],
    [1024, 900],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    for (const language of ["en", "ar"]) {
      await page.locator("#language").selectOption(language);
      for (const theme of ["dark", "light"]) {
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page.locator("#theme-toggle").click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const logo = page.locator(`.topbar .logo-${theme}`);
        await expect(logo).toBeVisible();
        expect(
          await logo.evaluate((img) => img.complete && img.naturalWidth > 0),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(`${width}-${language}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  }
  await page.locator("#language").selectOption("en");
  const links = page.locator("footer a[target='_blank']");
  expect(await links.count()).toBe(4);
  for (const link of await links.all())
    expect(await link.getAttribute("rel")).toBe("noopener noreferrer");
  await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator("footer")).not.toContainText("Not published");
  await expect(page.locator(".topbar")).not.toContainText("Demo platform");
  for (const path of [
    "/brand/approved/favicon.ico?v=4",
    "/brand/approved/favicon-16.png",
    "/brand/approved/favicon-32.png",
    "/brand/approved/apple-touch-icon.png",
    "/brand/approved/og-image-1200x630.jpg",
  ])
    expect((await page.request.get(path)).ok()).toBe(true);
  expect(errors).toEqual([]);
});

test("Reduced motion preserve keyboard station search", async ({ page }) => {
  await page.route("**/media/hero-*", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#to").fill("Tánger");
  await expect(page.locator("#to-results-status")).toContainText(
    "stations found",
  );
  await page.locator("#to").press("ArrowDown");
  await page.locator("#to").press("Enter");
  await expect(page.locator("#to")).toHaveValue("Tangier Ville");
  await page.locator("#from").fill("Rabat Agdal");
  await page.locator("#from").press("ArrowDown");
  await page.locator("#from").press("Enter");
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page.locator(".services")).toBeVisible();
});
