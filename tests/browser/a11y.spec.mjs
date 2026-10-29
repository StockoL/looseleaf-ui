// Accessibility: axe-core's WCAG 2.2 A/AA rules (contrast, names, focus,
// target size…) on the demo in both schemes and on the configurator.
import { fileURLToPath, pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const page = (path) => pathToFileURL(fileURLToPath(new URL(`../../${path}`, import.meta.url))).href;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function describe(violations) {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(" ")}`).join("\n")}`)
    .join("\n");
}

const cases = [
  { name: "demo, light, 1280px", url: page("examples/index.html"), scheme: "light", width: 1280 },
  { name: "demo, dark, 1280px", url: page("examples/index.html"), scheme: "dark", width: 1280 },
  { name: "demo, light, 360px", url: page("examples/index.html"), scheme: "light", width: 360 },
  { name: "demo, dark, 360px", url: page("examples/index.html"), scheme: "dark", width: 360 },
  { name: "configurator", url: page("tools/configure.html"), scheme: "light", width: 1440 },
];

for (const { name, url, scheme, width } of cases) {
  test(`no axe violations: ${name}`, async ({ page: tab }) => {
    await tab.setViewportSize({ width, height: 900 });
    await tab.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await tab.goto(url);
    await tab.waitForLoadState("load");
    const { violations } = await new AxeBuilder({ page: tab }).withTags(TAGS).analyze();
    expect(violations, describe(violations)).toEqual([]);
  });
}
