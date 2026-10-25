import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
const browserErrors = new Map<Page, string[]>();
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-19T19:00:00Z"));
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "No browser errors").toEqual([]);
  browserErrors.delete(page);
});
async function onboard(page: Page) {
  await page.goto("./");
  await page.getByLabel("Current weight (lb)").fill("135");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Your program")).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
}
async function nav(page: Page, name: string) {
  if (name === "Programs" || name === "Nutrition") {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: new RegExp(name) })
      .click();
    return;
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: true })
    .click();
}
async function settings(page: Page) {
  await page.goto("./#Settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}
test("onboarding units, equipment grouping, direct machine access and exercise notes persist", async ({
  page,
}, info) => {
  await page.goto("./");
  await page.getByLabel("Current weight (lb)").fill("135");
  await page.getByLabel("Target weight (lb)").fill("145");
  await page.getByLabel("Units", { exact: true }).selectOption("kg");
  await expect(page.getByLabel("Current weight (kg)")).toHaveValue("61.2");
  await expect(page.getByLabel("Target weight (kg)")).toHaveValue("65.8");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Organize machines by (optional)").selectOption("area");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.locator(".exercise-preview.plan-link").first().click();
  await expect(
    page.getByRole("dialog", { name: "Bench & barbell", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#Machines\?machine=m-bench$/);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Filters & groups" }).click();
  await expect(page.getByLabel("Group machines by")).toHaveValue("area");
  await page.getByLabel("Group machines by").selectOption("type");
  await nav(page, "Today");
  await nav(page, "Machines");
  await page.getByRole("button", { name: "Filters & groups" }).click();
  await expect(page.getByLabel("Group machines by")).toHaveValue("type");
  await page.getByLabel("Group machines by").selectOption("muscle");
  await expect(page.locator(".machine-group").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-machine-groups.png`,
    fullPage: true,
  });
  await nav(page, "Programs");
  await page.locator(".library button").first().click();
  await page
    .getByLabel("Personal exercise notes")
    .fill("Keep elbows comfortable");
  await page
    .getByRole("button", { name: "Save exercise notes", exact: true })
    .click();
  await expect(
    page.getByText("Exercise notes saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.reload();
  await page.locator(".library button").first().click();
  await expect(page.getByLabel("Personal exercise notes")).toHaveValue(
    "Keep elbows comfortable",
  );
  await expect(
    page.getByRole("heading", { name: "Personal records by machine" }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations.map((v) => v.id)).toEqual([]);
});
test("onboarding, full workout lifecycle, replacement, history and offline", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page);
  await page.screenshot({
    path: `test-results/${info.project.name}-today.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  const card = page.locator(".live-exercise").first();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  const ex = await card.locator("h2").innerText();
  await card.locator("summary").click();
  await card
    .getByLabel("Exercise notes", { exact: true })
    .fill("Controlled tempo");
  await card.getByLabel("Fatigue today", { exact: true }).selectOption("high");
  await expect(card.getByLabel("Exercise notes", { exact: true })).toHaveValue(
    "Controlled tempo",
  );
  await expect(card.getByLabel("Fatigue today", { exact: true })).toHaveValue(
    "high",
  );
  await card.locator("summary").click();
  await page
    .getByLabel("Workout notes", { exact: true })
    .fill("Solid foundation session");
  await expect(page.getByLabel("Workout notes", { exact: true })).toHaveValue(
    "Solid foundation session",
  );
  await card.getByLabel(`${ex} set 1 weight`, { exact: true }).fill("50");
  await card.getByLabel(`${ex} set 1 reps`, { exact: true }).fill("12");
  await card.getByLabel(`${ex} set 1 RIR`, { exact: true }).fill("2");
  await card
    .getByRole("button", { name: `Complete ${ex} set 1`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Skip", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await expect(
    page.getByLabel(`${ex} set 1 weight`, { exact: true }),
  ).toHaveValue("50");
  await expect(
    page.getByRole("button", { name: `Uncheck ${ex} set 1`, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Pause workout", exact: true })
    .click();
  await expect(
    page.getByText("Workout paused.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click();
  await card.getByRole("button", { name: "+ Warm-up", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Set 1 type: warmup", exact: true }),
  ).toBeVisible();
  await card
    .getByRole("button", { name: `Delete ${ex} set 1`, exact: true })
    .click();
  await expect(card.locator(".set-row")).toHaveCount(4);
  await card
    .getByRole("button", { name: `Move ${ex} down`, exact: true })
    .click();
  await expect(page.locator(".live-exercise").nth(1).locator("h2")).toHaveText(
    ex,
  );
  await page
    .locator(".live-exercise")
    .nth(1)
    .getByRole("button", { name: `Move ${ex} up`, exact: true })
    .click();
  await expect(card.locator("h2")).toHaveText(ex);
  const originalCount = await page.locator(".live-exercise").count();
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  await page
    .getByRole("button", { name: "Add to session", exact: true })
    .click();
  await expect(page.locator(".live-exercise")).toHaveCount(originalCount + 1);
  const added = page.locator(".live-exercise").last();
  await added.locator("summary").click();
  await added
    .getByRole("button", { name: "Remove exercise", exact: true })
    .click();
  await expect(page.locator(".live-exercise")).toHaveCount(originalCount);
  await card.getByRole("button", { name: "Add set", exact: true }).click();
  await expect(card.locator(".set-row")).toHaveCount(5);
  await card
    .getByRole("button", { name: `Delete ${ex} set 5`, exact: true })
    .click();
  await expect(card.locator(".set-row")).toHaveCount(4);
  await card
    .getByRole("button", { name: "Machine occupied?", exact: true })
    .click();
  await page.getByLabel("Replacement machine").selectOption("m-press");
  await page.getByRole("button", { name: "Use this setup" }).click();
  await expect(
    page.locator(".live-exercise").first().locator(".set-row"),
  ).toHaveCount(1);
  const replacement = page.locator(".live-exercise").nth(1);
  await expect(
    replacement.getByRole("button", {
      name: "Incline chest press",
      exact: true,
    }),
  ).toBeVisible();
  await replacement
    .getByLabel(`${ex} set 1 weight`, { exact: true })
    .fill("20");
  await replacement
    .getByRole("button", { name: `Complete ${ex} set 1`, exact: true })
    .click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await replacement
    .getByRole("button", { name: "Machine occupied?", exact: true })
    .click();
  await page.getByLabel("Exercise", { exact: true }).selectOption("dbpress");
  await page.getByLabel("Replacement machine").selectOption("m-dumbbell");
  await page.getByRole("button", { name: "Use this setup" }).click();
  await expect(replacement.locator("h2")).toHaveText(ex);
  const alternative = page.locator(".live-exercise").nth(2);
  await expect(alternative.locator("h2")).toHaveText("Incline dumbbell press");
  await alternative
    .getByLabel("Incline dumbbell press set 1 weight", { exact: true })
    .fill("20");
  await alternative
    .getByRole("button", {
      name: "Complete Incline dumbbell press set 1",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.screenshot({
    path: `test-results/${info.project.name}-workout.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workout saved" }),
  ).toBeVisible();
  await expect(
    page.getByText("First recorded best", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await nav(page, "Progress");
  await expect(page.getByLabel("Exercise and machine")).toHaveValue(
    JSON.stringify(["bench", "m-bench"]),
  );
  await expect(
    page.getByRole("img", { name: /Heaviest working set/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bodyweight", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Bodyweight \(lb\)/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Strength", exact: true }).click();
  await page.locator(".progress-details > summary").click();
  await page
    .getByRole("button", { name: "Machine usage", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Most-used machines" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to overview" }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await nav(page, "Today");
  await page.getByRole("button", { name: "Repeat last workout" }).click();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await expect(
    page
      .locator(".live-exercise")
      .first()
      .getByLabel(`${ex} set 1 weight`, { exact: true }),
  ).toHaveValue("50");
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("skipping weight and equipment keeps onboarding usable and assignments honest", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Skip machine setup", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.locator(".exercise-preview").first()).toContainText(
    "Choose equipment",
  );
  await nav(page, "Machines");
  await expect(
    page.getByRole("heading", { name: "No machines found" }),
  ).toBeVisible();
  await nav(page, "Today");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await expect(
    page
      .locator(".live-exercise")
      .first()
      .getByRole("button", { name: "Choose equipment", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await expect(page.locator(".live-exercise")).toHaveCount(6);
});
test("machine creation, program assignment, nutrition, theme and backups", async ({
  page,
}, info) => {
  await onboard(page);
  await nav(page, "Machines");
  await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);
  await page.getByRole("button", { name: "Add machine", exact: true }).click();
  await page.getByLabel("Machine name").fill("Chest press near mirrors");
  await page.getByLabel("Gym area", { exact: true }).fill("Chest corner");
  await page.getByLabel("Seat position").fill("3");
  await page.getByLabel("Pad position").fill("2");
  await page
    .getByLabel("Machine photo (optional)")
    .setInputFiles("public/icon-192.png");
  await expect(
    page.getByRole("img", { name: "Chest press near mirrors" }),
  ).toHaveAttribute("src", /^data:image\/png;base64,/);
  await page.getByRole("button", { name: "Save machine", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chest press near mirrors" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View Chest press near mirrors", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);
  await expect(
    page.locator(".list-line").filter({ hasText: "Seat position" }),
  ).toHaveText("Seat position3");
  await expect(
    page.locator(".list-line").filter({ hasText: "Pad position" }),
  ).toHaveText("Pad position2");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Favorite Chest press near mirrors",
      exact: true,
    })
    .click();
  await nav(page, "Programs");
  await page
    .getByRole("button", { name: "Edit Full Body A", exact: true })
    .click();
  await page
    .getByLabel("Assigned machine")
    .first()
    .selectOption({ label: "Chest press near mirrors" });
  await page.getByRole("button", { name: "Save program" }).click();
  await nav(page, "Today");
  await expect(
    page.getByText("Chest press near mirrors · 4 × 10"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  const first = page.locator(".live-exercise").first();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await first
    .getByLabel("Bench press set 1 weight", { exact: true })
    .fill("40");
  await first
    .getByRole("button", {
      name: "Complete Bench press set 1",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByText("Setup: seat: 3 · pad: 2", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await nav(page, "Nutrition");
  await page.getByLabel("Weight today (lb)").fill("136");
  await page.getByRole("button", { name: "Save weigh-in" }).click();
  await page.getByLabel("Food or meal (optional)").fill("Lunch");
  await page.getByLabel("Protein (g)", { exact: true }).fill("35");
  await page.getByLabel("Calories (optional)", { exact: true }).fill("600");
  await page.getByLabel("Save as a frequent meal").check();
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  await expect(page.getByText("35 g protein · 600 kcal")).toBeVisible();
  await page.getByRole("button", { name: "+ Lunch 35 g", exact: true }).click();
  await expect(page.getByText("35 g protein · 600 kcal")).toHaveCount(2);
  await page.getByRole("button", { name: "Adjust goals", exact: true }).click();
  await page.getByLabel("Protein goal (g/day)").fill("120");
  await page.getByLabel("Calorie target (optional)").fill("2400");
  await page.getByLabel("Target weight (lb, optional)").fill("145");
  await page.getByRole("button", { name: "Save goals", exact: true }).click();
  await expect(page.getByText("Optional goal: 2400 kcal")).toBeVisible();
  await page
    .getByRole("button", { name: "Skip detailed food tracking", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Food log" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Enable simple food tracking", exact: true })
    .click();
  await nav(page, "Progress");
  await page.locator(".progress-details > summary").click();
  await page
    .getByRole("button", { name: "+ Add measurement", exact: true })
    .click();
  await page.getByLabel("Body area").selectOption("Arms");
  await page.getByLabel("Measurement (cm)").fill("32.5");
  await page
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.getByText("32.5 cm", { exact: true })).toBeVisible();
  await settings(page);
  await page.getByRole("button", { name: "Daylight" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: `test-results/${info.project.name}-light-settings.png`,
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const content = await readFile(path!, "utf8");
  expect(JSON.parse(content).data.history).toHaveLength(1);
  expect(JSON.parse(content).data.measurements[0].cm).toBe(32.5);
  expect(
    JSON.parse(content).data.meals.some(
      (m: { name: string }) => m.name === "Lunch",
    ),
  ).toBe(true);
  expect(
    JSON.parse(content).data.machines.find(
      (m: { name: string }) => m.name === "Chest press near mirrors",
    ).photo,
  ).toMatch(/^data:image\/png;base64,/);
  expect(
    JSON.parse(content).data.machines.some(
      (m: { name: string }) => m.name === "Chest press near mirrors",
    ),
  ).toBe(true);
  await page.getByLabel("Import backup", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid"),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Import rejected" }),
  ).toBeVisible();
  await page.getByLabel("Import backup", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(content),
  });
  await page
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await expect(
    page.getByText("Backup restored.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByText("Recovery snapshots", { exact: true }),
  ).toBeVisible();
  await nav(page, "Machines");
  await page.getByLabel("Search machines").fill("mirrors");
  await expect(
    page.getByRole("heading", { name: "Chest press near mirrors" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("accessible navigation and forms, cross-tab saves, custom program, archive and discard", async ({
  page,
  context,
}) => {
  await onboard(page);
  for (const name of [
    "Today",
    "Programs",
    "Machines",
    "Progress",
    "Nutrition",
  ]) {
    await nav(page, name);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      name,
    ).toEqual([]);
  }
  await settings(page);
  const other = await context.newPage();
  await other.goto("./#Settings");
  await page.getByLabel("Name", { exact: true }).fill("Test athlete");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(other.locator(".profile-chip")).toContainText("Test athlete");
  await other.goto("./#Today");
  await expect(other.getByRole("heading", { name: "Today" })).toBeVisible();
  await other.close();
  await page.getByRole("button", { name: "Daylight" }).click();
  for (const name of [
    "Today",
    "Programs",
    "Machines",
    "Progress",
    "Nutrition",
  ]) {
    await nav(page, name);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      `Light mode ${name}`,
    ).toEqual([]);
  }
  await nav(page, "Programs");
  await page
    .getByRole("button", { name: "Create program", exact: true })
    .click();
  await page.getByLabel("Program name").fill("Quick session");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Save program", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Quick session", exact: true }),
  ).toBeVisible();
  const program = page.locator(".program-grid .card").filter({
    has: page.getByRole("heading", { name: "Quick session", exact: true }),
  });
  await program.getByRole("button", { name: "Start this session" }).click();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  const workoutAccess = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    workoutAccess.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    "Workout accessibility",
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Discard workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard session", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await nav(page, "Machines");
  await page
    .getByRole("heading", { name: "Incline chest press", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Archive machine", exact: true })
    .click();
  await page.getByRole("button", { name: "Filters & groups" }).click();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Incline chest press", exact: true }),
  ).toBeVisible();
});
test("manifest, narrow layouts, empty analytics, reduced motion and invalid input", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await onboard(page);
  for (const name of [
    "Today",
    "Programs",
    "Machines",
    "Progress",
    "Nutrition",
  ]) {
    await nav(page, name);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name,
    ).toBe(true);
  }
  await nav(page, "Progress");
  await expect(page.getByText("No data yet").first()).toBeVisible();
  const manifest = await (
    await page.request.get("manifest.webmanifest")
  ).json();
  expect(manifest.start_url).toBe("/gym/");
  expect(manifest.scope).toBe("/gym/");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    expect((await page.request.get(icon.src)).status()).toBe(200);
  }
  await nav(page, "Nutrition");
  await page.getByLabel("Weight today (lb)").fill("-1");
  await page.getByRole("button", { name: "Save weigh-in" }).click();
  await expect(page.getByLabel("Weight today (lb)")).toHaveValue("-1");
  await page.screenshot({
    path: `test-results/${info.project.name}-narrow.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const name of [
    "Today",
    "Programs",
    "Machines",
    "Progress",
    "Nutrition",
  ]) {
    await nav(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Tablet ${name}`,
    ).toBe(true);
  }
  await nav(page, "Today");
  await page.screenshot({
    path: `test-results/${info.project.name}-tablet.png`,
    fullPage: true,
  });
});
