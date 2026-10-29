// Behaviours that need JavaScript: keyboard and screen reader contracts of the
// tabs, toast, form feedback, password reveal and motion toggle modules.
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const DEMO = pathToFileURL(fileURLToPath(new URL("../../examples/index.html", import.meta.url))).href;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(DEMO);
});

test.describe("tabs", () => {
  test("become a tab list with one panel showing", async ({ page }) => {
    const tabs = page.locator(".tabs").first();
    await expect(tabs).toHaveAttribute("data-js", "");
    await expect(tabs.locator(".tabs__list")).toHaveAttribute("role", "tablist");
    await expect(tabs.getByRole("tab")).toHaveCount(3);
    await expect(tabs.getByRole("tab", { selected: true })).toHaveText("Plain HTML");
    await expect(tabs.getByRole("tabpanel")).toHaveCount(1);
  });

  test("arrow keys, Home and End move and select, with a roving tabindex", async ({ page }) => {
    const tabs = page.locator(".tabs").first();
    await tabs.getByRole("tab", { name: "Plain HTML" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Django" })).toBeFocused();
    await expect(tabs.getByRole("tab", { name: "Django" })).toHaveAttribute("aria-selected", "true");
    await expect(tabs.getByRole("tabpanel")).toContainText("INSTALLED_APPS");
    await page.keyboard.press("End");
    await expect(tabs.getByRole("tab", { name: "Build step" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Plain HTML" })).toBeFocused(); // wraps
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Home");
    await expect(tabs.getByRole("tab", { name: "Plain HTML" })).toBeFocused();
    await expect(tabs.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(tabs.getByRole("tabpanel")).toBeFocused(); // Tab leaves the list for the panel
  });

  test("a click selects without jumping the page", async ({ page }) => {
    const tabs = page.locator(".tabs").first();
    await tabs.getByRole("tab", { name: "Build step" }).click();
    await expect(tabs.getByRole("tabpanel")).toContainText("npx looseleaf-ui compile");
    expect(await page.evaluate(() => location.hash)).toBe("");
  });
});

test.describe("toast", () => {
  test("appears in a live region, pauses while hovered, then dismisses itself", async ({ page }) => {
    await page.clock.install();
    await page.getByRole("button", { name: "Save" }).click();
    const region = page.locator(".toast-region");
    await expect(region).toHaveAttribute("aria-live", "polite");
    const toast = region.locator(".toast", { hasText: "Your changes were saved." });
    await expect(toast).toBeVisible();
    expect(await region.evaluate((el) => el.matches(":popover-open"))).toBe(true);

    await toast.hover();
    await page.clock.runFor(8000);
    await expect(toast).toBeVisible(); // paused while hovered

    await page.mouse.move(5, 5);
    await page.clock.runFor(6000);
    await expect(toast).toHaveCount(0);
  });

  test("danger toasts stay, announce assertively and close from their button", async ({ page }) => {
    await page.clock.install();
    await page.getByRole("button", { name: "Fail" }).click();
    const toast = page.locator(".toast", { hasText: "Could not reach the server." });
    await expect(toast).toHaveAttribute("role", "alert");
    await page.mouse.move(5, 5);
    await page.clock.runFor(20000);
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Dismiss" }).click();
    await expect(toast).toHaveCount(0);
  });

  test("shows at most three at once and queues the rest", async ({ page }) => {
    await page.clock.install();
    await page.mouse.move(5, 5);
    for (let i = 0; i < 5; i++) await page.evaluate((n) => document.dispatchEvent(new CustomEvent("looseleaf:toast", { detail: { message: `Toast ${n}` } })), i);
    await expect(page.locator(".toast-region > .toast:visible")).toHaveCount(3);
    await page.clock.runFor(6000);
    await expect(page.locator(".toast-region > .toast:visible")).toHaveCount(2); // the queued two
  });

  test("a toast raised while a dialog is open shows above it", async ({ page }) => {
    await page.getByRole("button", { name: "Open modal" }).click();
    await page.evaluate(() => document.dispatchEvent(new CustomEvent("looseleaf:toast", { detail: { message: "Above the dialog" } })));
    const toast = page.locator(".toast", { hasText: "Above the dialog" });
    await expect(toast).toBeVisible();
    const box = await toast.boundingBox();
    const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".toast")?.textContent, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    expect(top).toContain("Above the dialog");

    // Usable inside the modal (not inert), and back in the page once it closes
    await page.evaluate(() => document.dispatchEvent(new CustomEvent("looseleaf:toast", { detail: { message: "Second", status: "danger" } })));
    await page.locator(".toast", { hasText: "Second" }).getByRole("button", { name: "Dismiss" }).click();
    await expect(page.locator(".toast", { hasText: "Second" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.locator("#demo-modal")).not.toHaveAttribute("open", "");
    expect(await page.locator(".toast-region").evaluate((el) => el.parentElement === document.body && el.matches(":popover-open"))).toBe(true);
    await expect(toast).toBeVisible();
  });
});

test.describe("form feedback", () => {
  test("leaving a changed field shows the browser's message inline", async ({ page }) => {
    const email = page.locator("#live-email");
    await email.fill("not-an-email");
    await email.blur();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const error = page.locator("#live-email ~ .field__error");
    await expect(error).toBeVisible();
    expect(await email.evaluate((el) => el.validationMessage)).toBe(await error.textContent());
    expect((await email.getAttribute("aria-describedby")).split(" ")).toContain(await error.getAttribute("id"));

    await email.fill("ada@example.com"); // fixes itself as you type
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await expect(error).toBeHidden();
  });

  test("an untouched field is not marked until the form is sent", async ({ page }) => {
    await page.locator("#live-email").focus();
    await page.locator("#live-email").blur();
    await expect(page.locator("#live-email")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("sending focuses the first problem and marks every invalid field", async ({ page }) => {
    await page.locator("#live-bio").fill("Hello");
    await page.getByRole("button", { name: "Send" }).nth(1).click();
    await expect(page.locator("#live-email")).toBeFocused();
    await expect(page.locator("#live-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#live-password")).toHaveAttribute("aria-invalid", "true");
    expect(await page.evaluate(() => location.search)).toBe(""); // the form did not submit
  });

  test("counts characters against maxlength", async ({ page }) => {
    await page.locator("#live-bio").fill("Twelve chars");
    await expect(page.locator("#live-bio ~ [data-counter]")).toHaveText("128 characters left");
  });
});

test("password reveal toggles the field with a pressed button", async ({ page }) => {
  const input = page.locator("#live-password");
  const button = page.getByRole("button", { name: "Show password" });
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await button.click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await button.click();
  await expect(input).toHaveAttribute("type", "password");
});

test("motion toggle reduces motion, is remembered, and undoes", async ({ page }) => {
  const toggle = page.locator("[data-motion-toggle]");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toContainText("Reduced");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.locator("[data-motion-toggle]").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-motion", "reduced");
});
