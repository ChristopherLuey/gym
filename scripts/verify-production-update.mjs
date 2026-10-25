// Manual release check: start before deploying a new application build, then
// press Enter after that deployment succeeds. Uses an isolated synthetic profile.
import { chromium, devices, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const base =
  process.env.GYM_BASE_URL ?? "https://christopherluey.github.io/gym/";
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
let equipmentName = "";
async function openMachineEditor() {
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Machines", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit " + equipmentName, exact: true })
    .click();
}
async function openEditor() {
  const button = page.getByRole("button", {
    name: "Edit workout",
    exact: true,
  });
  // Wait for the route to settle before detecting an older full-editor release.
  await button.or(page.locator(".live-exercise").first()).waitFor();
  if (await button.count()) await button.click();
}
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
try {
  await page.clock.setFixedTime(new Date("2026-10-19T19:00:00Z"));
  await page.goto(base);
  await page.getByLabel("Current weight (lb)").fill("135");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: /^(Let’s get stronger|Get started)$/ })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  equipmentName = await page
    .locator(".today-first-machine > strong")
    .innerText();
  await openMachineEditor();
  await page.getByLabel("Seat position").fill("4");
  await page.getByRole("button", { name: "Save machine", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Today", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Full Body A", exact: true }),
  ).toBeVisible();
  await openEditor();
  let card = page.locator(".live-exercise").first();
  const exercise = await card.locator("h2").innerText();
  await card.getByLabel(`${exercise} set 1 weight`, { exact: true }).fill("50");
  await card
    .getByRole("button", { name: `Complete ${exercise} set 1`, exact: true })
    .click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Full Body A", exact: true }),
  ).toBeVisible();
  await openEditor();
  await expect(
    card.getByLabel(`${exercise} set 1 weight`, { exact: true }),
  ).toHaveValue("50");
  const before = await page
    .locator('script[type="module"]')
    .getAttribute("src");
  console.log(
    `READY: saved active workout on ${base}. Bundle: ${before}. Deploy a new build, then press Enter.`,
  );
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));
  process.stdin.pause();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect(
    page.getByText("Finish your workout before updating.", { exact: false }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Update GYM", exact: true }),
  ).toHaveCount(0);
  await expect(
    card.getByRole("button", {
      name: `Uncheck ${exercise} set 1`,
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByText("Setup: seat: 4", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^(Keep the rhythm|Done)$/ }).click();
  await expect(
    page.getByRole("button", { name: "Update GYM", exact: true }),
  ).toBeVisible();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.getByRole("button", { name: "Update GYM", exact: true }).click(),
  ]);
  const after = await page.locator('script[type="module"]').getAttribute("src");
  expect(after).not.toBe(before);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Progress", exact: true })
    .click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Today", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Repeat last workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Full Body A", exact: true }),
  ).toBeVisible();
  await openEditor();
  card = page.locator(".live-exercise").first();
  await expect(card.locator(".set-row")).toHaveCount(4);
  await expect(
    card.getByLabel(`${exercise} set 1 reps`, { exact: true }),
  ).toHaveValue("10");
  await expect(
    card.getByLabel(`${exercise} set 1 weight`, { exact: true }),
  ).toHaveValue("50");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Full Body A", exact: true }),
  ).toBeVisible();
  await openEditor();
  await expect(
    card.getByLabel(`${exercise} set 1 weight`, { exact: true }),
  ).toHaveValue("50");
  await openMachineEditor();
  await expect(page.getByLabel("Seat position")).toHaveValue("4");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Workout", exact: true })
    .click();
  await openEditor();
  await card
    .getByRole("button", { name: `Complete ${exercise} set 1`, exact: true })
    .click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Full Body A", exact: true }),
  ).toBeVisible();
  await openEditor();
  await expect(
    card.getByRole("button", {
      name: `Uncheck ${exercise} set 1`,
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/production-update-offline.png",
    fullPage: true,
  });
  const report = {
    base,
    before,
    after,
    checkedAt: new Date().toISOString(),
    activeUpdateDeferred: true,
    historyRetained: true,
    machineSetupRetained: true,
    offlineLoggingPersisted: true,
    browserErrors: errors,
  };
  await writeFile(
    "test-results/production-update.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  process.stdin.pause();
  await browser.close();
}
