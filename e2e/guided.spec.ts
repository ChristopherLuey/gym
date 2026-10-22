import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function begin(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-19T19:00:00Z"));
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Let’s get stronger" }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
}
test("guided session walks through every set and machine, survives offline rest and finishes", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await begin(page);
  await expect(page.locator(".live-exercise")).toHaveCount(0);
  await expect(
    page.getByRole("img", {
      name: "Incline chest press equipment illustration",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await page.getByLabel("Seat position").fill("4");
  await page.getByRole("button", { name: "Save setup" }).click();
  await expect(page.locator(".guide-saved-setup")).toContainText("4");
  await page.screenshot({
    path: "test-results/" + info.project.name + "-guided-setup.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ready for my set" }).click();
  await page
    .getByRole("button", { name: "Pause workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Take your time." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .last()
    .click();
  await page.getByLabel("Set weight", { exact: true }).fill("50");
  await page.getByLabel("Reps completed", { exact: true }).fill("12");
  await page.screenshot({
    path: "test-results/" + info.project.name + "-guided-set.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Set complete", exact: true }).click();
  await expect(
    page.getByText("1 of 12 sets complete", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo last set" }).click();
  await expect(page.getByLabel("Set weight", { exact: true })).toHaveValue(
    "50",
  );
  await expect(
    page.getByText("0 of 12 sets complete", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Set complete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Breathe. Reset." }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Breathe. Reset." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/" + info.project.name + "-guided-rest.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "I’m ready", exact: true }).click();
  await expect(page.getByLabel("Set weight", { exact: true })).toHaveValue(
    "50",
  );
  await expect(page.getByRole("heading", { name: "Set 2 of 2" })).toBeVisible();
  await page.getByRole("button", { name: "Set complete", exact: true }).click();
  await page.getByRole("button", { name: "I’m ready", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lat pulldown", exact: true }),
  ).toBeVisible();
  const names = [
    "Lat pulldown",
    "Leg press",
    "Seated leg curl",
    "Cable lateral raises",
    "Bicep curls",
  ];
  for (const [index, name] of names.entries()) {
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ready for my set" }).click();
    for (let set = 0; set < 2; set++) {
      await page.getByLabel("Set weight", { exact: true }).fill("20");
      await page
        .getByRole("button", { name: "Set complete", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: index === 4 && set === 1 ? "Review workout" : "I’m ready",
          exact: true,
        })
        .click();
    }
  }
  await expect(
    page.getByRole("heading", { name: "You did the work." }),
  ).toBeVisible();
  await expect(
    page.getByText("12 of 12 sets complete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You showed up." }),
  ).toBeVisible();
  await expect(
    page.getByText("Setup: seat: 4", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep the rhythm" }).click();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("guided machine replacement and plan navigation preserve completed sets", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Ready for my set" }).click();
  await page.getByLabel("Set weight", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Set complete", exact: true }).click();
  await page.getByRole("button", { name: "I’m ready", exact: true }).click();
  await page
    .getByRole("button", { name: "Machine occupied?", exact: true })
    .click();
  await page.getByLabel("Replacement machine").selectOption("m-cable");
  await page.getByRole("button", { name: "Use this setup" }).click();
  await expect(
    page.getByRole("img", { name: "Cable station equipment illustration" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Cable station equipment illustration" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ready for my set" }).click();
  await expect(page.getByLabel("Set weight", { exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Workout plan", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Lat pulldown/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lat pulldown", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await expect(
    page.locator(".live-exercise").first().locator(".set-row"),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".live-exercise")
      .first()
      .getByRole("button", {
        name: "Uncheck Incline machine chest press set 1",
      }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Back to guided workout" }).click();
  await expect(
    page.getByRole("heading", { name: "Lat pulldown", exact: true }),
  ).toBeVisible();
});

test("guided screens and simpler navigation remain accessible in both themes", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await begin(page);
  for (const phase of ["setup", "set", "rest"]) {
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (phase === "setup")
      await page.getByRole("button", { name: "Ready for my set" }).click();
    if (phase === "set")
      await page
        .getByRole("button", { name: "Set complete", exact: true })
        .click();
  }
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /Settings/ })
    .click();
  await page.getByRole("button", { name: "Daylight" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Workout", exact: true })
    .click();
  await page.getByRole("button", { name: "I’m ready", exact: true }).click();
  const light = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(light.violations.map((v) => v.id)).toEqual([]);
  await page.screenshot({
    path: "test-results/" + info.project.name + "-guided-light.png",
    fullPage: true,
  });
});
