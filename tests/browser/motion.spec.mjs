// Motion master switches: with reduced motion from the OS, or data-motion="reduced"
// on <html>, nothing on the demo transitions or animates for any length of time.
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const DEMO = pathToFileURL(fileURLToPath(new URL("../../examples/index.html", import.meta.url))).href;

// Every non-zero transition or animation duration on the page, as "selector: property value"
function nonZeroDurations(limitMs) {
  const toMs = (value) => (value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);
  const found = [];
  for (const element of document.querySelectorAll("*")) {
    for (const pseudo of [null, "::before", "::after"]) {
      const style = getComputedStyle(element, pseudo);
      for (const property of ["transition-duration", "animation-duration"]) {
        const values = style.getPropertyValue(property).split(",").map((v) => v.trim());
        if (values.some((v) => v !== "auto" && toMs(v) > limitMs)) {
          const name = element.tagName.toLowerCase() + (element.className && typeof element.className === "string" ? `.${element.className.trim().split(/\s+/).join(".")}` : "");
          found.push(`${name}${pseudo || ""}: ${property} ${values.join(", ")}`);
        }
      }
    }
  }
  return found;
}

test("motion runs when nothing reduces it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(DEMO);
  expect((await page.evaluate(nonZeroDurations, 0)).length).toBeGreaterThan(0);
});

test("the OS reduced-motion setting leaves nothing longer than 0.01ms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(DEMO);
  expect(await page.evaluate(nonZeroDurations, 0.01)).toEqual([]);
});

test('data-motion="reduced" makes every duration 0 on its own', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(DEMO);
  await page.evaluate(() => document.documentElement.setAttribute("data-motion", "reduced"));
  expect(await page.evaluate(nonZeroDurations, 0)).toEqual([]);
});
