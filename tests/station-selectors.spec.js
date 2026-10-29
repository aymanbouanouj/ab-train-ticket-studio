import { test, expect } from "@playwright/test";
import { stations, displayLocationName } from "../src/locations.js";
import { messages } from "../src/i18n.js";

test("Every registered station can be selected in either booking field", async ({
  page,
}) => {
  await page.goto("/");
  for (const id of ["from", "to"]) {
    const input = page.locator("#" + id);
    await input.focus();
    await expect(page.locator("#" + id + "-options [role=option]")).toHaveCount(
      22,
    );
    await input.fill("");
    await expect(page.locator("#" + id + "-options [role=option]")).toHaveCount(
      22,
    );
    await expect(page.locator("#" + id + "-options [role=group]")).toHaveCount(
      1,
    );
    for (const station of stations) {
      await input.fill(station.name);
      await page
        .locator("#" + id + "-options [role=option]")
        .filter({ has: page.getByText(station.name, { exact: true }) })
        .click();
      await expect(input).toHaveValue(station.name);
      await expect(input).toHaveAttribute("aria-expanded", "false");
    }
  }
});

for (const lang of ["en", "fr", "es", "ar"]) {
  test(
    "Station-only empty state, aliases and layout in " + lang,
    async ({ page }, testInfo) => {
      await page.addInitScript(
        (language) => localStorage.setItem("ab-train-language", language),
        lang,
      );
      for (const theme of ["light", "dark"]) {
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.goto("/");
          await page.evaluate(
            (value) => localStorage.setItem("ab-train-theme", value),
            theme,
          );
          await page.reload();
          await expect(page.locator("html")).toHaveAttribute(
            "dir",
            lang === "ar" ? "rtl" : "ltr",
          );
          for (const id of ["from", "to"]) {
            const input = page.locator("#" + id);
            await input.fill("");
            await expect(
              page.locator("#" + id + "-options [role=option]"),
            ).toHaveCount(22);
            await input.fill("Agadir");
            await expect(
              page.locator("#" + id + "-options [role=option]"),
            ).toHaveCount(0);
            await expect(page.locator("#" + id + "-options")).toHaveText(
              messages[lang]["No matching stations"],
            );
            await expect(page.locator("#" + id + "-results-status")).toHaveText(
              messages[lang]["No matching stations"],
            );
            await input.press("Enter");
            await expect(input).toHaveValue("Agadir");
            await input.fill(lang === "ar" ? "طنجة" : "Tánger");
            await input.press("ArrowDown");
            await input.press("Enter");
            await expect(input).toHaveValue(
              displayLocationName(
                stations.find((p) => p.id === "tangier"),
                lang,
              ),
            );
          }
          await page.locator("#from").fill("");
          await expect(page.locator("#from-options [role=option]")).toHaveCount(
            22,
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: testInfo.outputPath(
              lang + "-" + theme + "-" + width + ".png",
            ),
          });
        }
      }
    },
  );
}
