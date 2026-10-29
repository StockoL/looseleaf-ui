// Visual regression: the demo page shows every composition and block, so a
// full-page screenshot per width and scheme catches any unintended change.
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const DEMO = pathToFileURL(fileURLToPath(new URL("../../examples/index.html", import.meta.url))).href;

for (const width of [360, 768, 1280]) {
  for (const scheme of ["light", "dark"]) {
    test(`demo at ${width}px, ${scheme}`, async ({ page }, testInfo) => {
      const name = `demo-${width}-${scheme}.png`;
      test.skip(
        testInfo.config.updateSnapshots === "none" && !fs.existsSync(testInfo.snapshotPath(name)),
        "No baseline committed for this platform yet: run the 'Update visual baselines' workflow.",
      );

      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(DEMO);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(name, { fullPage: true });
    });
  }
}
