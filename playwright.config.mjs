// Browser tests: visual regression and accessibility (npm run test:browser).
import { defineConfig } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE; // optional local Chromium override

export default defineConfig({
  testDir: "tests/browser",
  // Baselines are per platform: fonts render differently on Linux, macOS and Windows.
  // Only the Linux ones (rendered by CI) are committed; local ones are git-ignored.
  snapshotPathTemplate: "tests/browser/__screenshots__/{arg}-{platform}{ext}",
  // CI never writes baselines; they come from the "Update visual baselines" workflow.
  updateSnapshots: process.env.CI ? "none" : "missing",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    browserName: "chromium",
    reducedMotion: "reduce",
    launchOptions: executablePath ? { executablePath } : {},
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", threshold: 0.05, maxDiffPixels: 0 },
  },
});
