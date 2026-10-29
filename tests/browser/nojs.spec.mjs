// No JavaScript: every control on the demo stays reachable with scripts
// disabled (npm run test:nojs). The ladder's first rung: usable with HTML alone.
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const DEMO = pathToFileURL(fileURLToPath(new URL("../../examples/index.html", import.meta.url))).href;
const INTERACTIVE = "a[href], button, input:not([type=hidden]), select, textarea, summary";

test.use({ javaScriptEnabled: false });

for (const width of [360, 1280]) {
  test.describe(`@nojs at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(DEMO);
    });

    test("every nav link is reachable and clickable", async ({ page }) => {
      const toggle = page.locator(".navbar__toggle > summary");
      if (width < 720) {
        await expect(page.locator(".navbar__menu")).toBeHidden();
        await toggle.click();
      } else {
        await expect(toggle).toBeHidden();
      }
      const items = page.locator(".navbar__menu").locator(INTERACTIVE);
      expect(await items.count()).toBeGreaterThan(0);
      for (const item of await items.all()) {
        await expect(item).toBeVisible();
        await item.click({ trial: true });
      }
    });

    test("every dropdown item is reachable", async ({ page }) => {
      for (const menu of await page.locator("details.dropdown-wrapper").all()) {
        await menu.locator(":scope > summary").click();
        const items = menu.locator(".dropdown__item");
        expect(await items.count()).toBeGreaterThan(0);
        for (const item of await items.all()) {
          await expect(item).toBeVisible();
          await item.click({ trial: true });
        }
        await menu.locator(":scope > summary").click(); // closes again: it's the only way without JS
        await expect(items.first()).toBeHidden();
      }
    });

    test("the accordion opens", async ({ page }) => {
      const item = page.locator(".accordion__item").first();
      await item.locator("summary").click();
      await expect(item.locator(".accordion__content")).toBeVisible();
    });

    test("the form submits", async ({ page }) => {
      const form = page.locator("form").first();
      await form.locator('[type="submit"]').click();
      await expect(page).toHaveURL(/\?/);
    });

    test("no interactive content is hidden outside closed details and dialogs", async ({ page }) => {
      if (width < 720) await page.locator(".navbar__toggle > summary").click(); // the collapsed menu: first test
      const hidden = [];
      for (const element of await page.locator(INTERACTIVE).all()) {
        // Inside a <dialog>: covered by the next test. Inside a closed <details>: opened by the tests above.
        if (await element.locator("xpath=ancestor::dialog | ancestor::details[not(@open)]").count()) continue;
        // Visually hidden radios and checkboxes are operated through their label; the toggle has no job at desktop
        if (await element.evaluate((el) => el.matches(".visually-hidden, .navbar__toggle > summary, .skip-link"))) continue;
        if (!(await element.isVisible())) hidden.push(await element.evaluate((el) => el.outerHTML.slice(0, 120)));
      }
      expect(hidden).toEqual([]);
    });

    test("every link inside a dialog is also reachable outside one", async ({ page }) => {
      const outside = new Set(
        await page.locator("a[href]").evaluateAll((links) => links.filter((a) => !a.closest("dialog")).map((a) => a.getAttribute("href"))),
      );
      const inDialogs = await page.locator("dialog a[href]").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
      expect(inDialogs.length).toBeGreaterThan(0);
      expect(inDialogs.filter((href) => !outside.has(href))).toEqual([]);
    });
  });
}
