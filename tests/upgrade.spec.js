import { test, expect } from "@playwright/test";

test("Navigation disclosure, footer assets and translated layouts across required widths", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ["en", "fr", "ar", "es"]) {
      await page.locator("#language").selectOption(language);
      for (const theme of ["dark", "light"]) {
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page.locator("#theme-toggle").click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await page
            .locator("footer a")
            .evaluateAll((links) =>
              links.every(
                (a) => a.getAttribute("href") && a.getAttribute("href") !== "#",
              ),
            ),
        ).toBe(true);
        // Only GitHub and LinkedIn have local raster/SVG brand marks;
        // Beacons is an accessible text link and Blog was intentionally removed.
        expect(await page.locator("footer .social-mark").count()).toBe(2);
        const controls = await page
          .locator(".header-controls select, .header-controls button:visible")
          .evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              return { x: r.x, y: r.y, w: r.width, h: r.height };
            }),
          );
        for (const r of controls) {
          expect(r.w).toBeGreaterThanOrEqual(44);
          expect(r.h).toBeGreaterThanOrEqual(44);
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(width);
        }
        for (let i = 0; i < controls.length; i++)
          for (let j = i + 1; j < controls.length; j++) {
            const a = controls[i],
              b = controls[j];
            expect(
              a.x + a.w <= b.x ||
                b.x + b.w <= a.x ||
                a.y + a.h <= b.y ||
                b.y + b.h <= a.y,
            ).toBe(true);
          }
        if (width < 761) {
          await expect(page.locator("#primary-navigation")).not.toBeVisible();
          await page.locator("#menu-toggle").click();
          await expect(page.locator("#primary-navigation")).toBeVisible();
          await page.locator("#home-link").focus();
          await page.keyboard.press("Escape");
          await expect(page.locator("#menu-toggle")).toBeFocused();
          await expect(page.locator("#menu-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
          );
        }
        await page.screenshot({
          path: info.outputPath(`${width}-${language}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  }
  expect(
    (await page.request.get("/brand/approved/zellige-divider.svg")).ok(),
  ).toBe(true);
  for (const name of ["github.svg", "linkedin.svg"])
    expect((await page.request.get(`/icons/${name}`)).ok()).toBe(true);
  // The third-party Beacons raster is deliberately excluded from publication.
  expect((await page.request.get("/icons/beacons.png")).status()).toBe(404);
  await expect(page.locator('footer a[href*="blogspot"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menu-toggle").click();
  await page.locator("#about-link").click();
  await expect(page.locator(".about")).toBeVisible();
  await expect(page.locator("#menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test("City names filter registered stations without geographic suggestions", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.locator("#from");
  await input.fill("Rabat");
  await expect(page.locator('#from-options [role="option"]')).toHaveCount(2);
  await expect(page.locator('#from-options [role="group"]')).toHaveCount(1);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveValue("Rabat Agdal");
  await input.fill("Agadir");
  await expect(page.locator('#from-options [role="option"]')).toHaveCount(0);
  await expect(page.locator("#from-options")).toHaveText(
    "No matching stations",
  );
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page.locator("#search-error")).toContainText("Choose both");
});
