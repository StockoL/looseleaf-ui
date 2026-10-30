// Accessibility of the configurator with each panel open: the a11y spec only sees it closed.
import { fileURLToPath, pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
const url = pathToFileURL(fileURLToPath(new URL("../../tools/configure.html", import.meta.url))).href;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
for (const panel of ["Type scale", "Space scale", "Palette", "Contrast", "Fonts", "Shape", "Motion", "Layout", "Defaults"]) {
  test(`axe: configurator with ${panel} open`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.locator("summary", { hasText: new RegExp(`^${panel}`) }).click();
    if (panel === "Palette") {
      for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Generate", exact: true }).click();
      await page.getByLabel("Start from a colour").fill("#ffd500");
      await page.getByRole("button", { name: "Use", exact: true }).click();
    }
    await page.waitForTimeout(300);
    const { violations } = await new AxeBuilder({ page }).include(".configurator__controls").withTags(TAGS).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`)).toEqual([]);
  });
}
