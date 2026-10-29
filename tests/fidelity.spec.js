import { test, expect } from "@playwright/test";
test("Reference composition, photographic routes and saved-theme override", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const geometry = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return {
      hero: r(".fidelity-hero").toJSON(),
      form: r(".home-search").toJSON(),
      progress: r(".home-progress").toJSON(),
      routes: r(".home-routes").toJSON(),
      footer: r(".page-footer").toJSON(),
    };
  });
  expect(geometry.hero.width).toBe(1672);
  expect(geometry.form.y).toBeGreaterThan(geometry.hero.y);
  expect(geometry.form.bottom).toBeLessThan(geometry.hero.bottom);
  expect(geometry.progress.y).toBeGreaterThan(geometry.form.bottom);
  expect(geometry.routes.y).toBeGreaterThan(geometry.progress.bottom);
  expect(geometry.footer.y).toBeLessThan(820);
  for (const language of ["en", "fr", "ar", "es"]) {
    await page.locator("#language").selectOption(language);
    expect(
      await page.evaluate(
        () =>
          document.querySelector(".fidelity-hero p").getBoundingClientRect()
            .bottom <=
          document.querySelector(".home-search").getBoundingClientRect().top,
      ),
    ).toBe(true);
  }
  await page.locator("#language").selectOption("en");
  await expect(page.locator(".route-photo")).toHaveCount(4);
  await expect(
    page.locator(".home-search .location-field > .ui-icon"),
  ).toHaveCount(2);
  await expect(page.locator(".fidelity-scene")).toHaveAttribute(
    "src",
    "/fidelity/reference-hero.png",
  );
  await page.locator("#language").selectOption("ar");
  expect(
    await page
      .locator(".fidelity-hero")
      .evaluate((el) => getComputedStyle(el, "::before").transform),
  ).toBe("none");
  await page.locator("#language").selectOption("en");
  expect(
    await page
      .locator(".route-photo img")
      .evaluateAll(
        (imgs) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0) &&
          new Set(imgs.map((i) => i.src)).size === 4,
      ),
  ).toBe(true);
  await page.locator(".route-photo").nth(1).click();
  await expect(page.locator("#from")).toHaveValue("Casablanca Voyageurs");
  await expect(page.locator("#to")).toHaveValue("Marrakech");
  await expect(page.locator("#from")).toBeFocused();
  await page.locator("#theme-toggle").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("Mobile reference hierarchy preserves inset labels and itinerary before discovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/");
  for (const language of ["en", "fr", "ar", "es"]) {
    await page.locator("#language").selectOption(language);
    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const c = getComputedStyle(document.querySelector("#from"));
      return {
        progress: r(".home-progress").y,
        form: r(".home-search").y,
        info: r(".home-info").y,
        routes: r(".home-routes").y,
        cta: r("#search-form button[type=submit]").bottom,
        padding: parseFloat(c.paddingInlineStart),
        width: document.documentElement.scrollWidth,
      };
    });
    expect(m.progress).toBeLessThan(m.form);
    expect(m.info).toBeGreaterThan(m.form);
    expect(m.info).toBeLessThan(m.routes);
    expect(m.padding).toBeGreaterThanOrEqual(40);
    expect(m.cta).toBeLessThan(852);
    expect(m.width).toBe(393);
  }
});
