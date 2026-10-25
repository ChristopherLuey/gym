import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function begin(page: Page, savedSetup = false) {
  await page.clock.setFixedTime(new Date("2026-10-19T19:00:00Z"));
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  if (savedSetup) {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Machines", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit Bench & barbell", exact: true })
      .click();
    await page.getByLabel("Seat position").fill("4");
    await page
      .getByRole("button", { name: "Save machine", exact: true })
      .click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Today", exact: true })
      .click();
  }
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
  await begin(page, true);
  await expect(page.locator(".live-exercise")).toHaveCount(0);
  await expect(page.getByLabel("Set weight", { exact: true })).toBeVisible();
  const complete = await page
    .getByRole("button", { name: "Set complete", exact: true })
    .boundingBox();
  const navigation = await page.getByRole("navigation").boundingBox();
  if ((page.viewportSize()?.width ?? 1000) < 700) {
    expect(complete!.y + complete!.height).toBeLessThanOrEqual(navigation!.y);
  }
  await expect(
    page.getByRole("button", {
      name: /Ready for my set|Show setup steps|technique/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("img", {
      name: "Bench & barbell equipment illustration",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/" + info.project.name + "-direct-set.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Pause workout", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
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
  await expect(page.getByLabel("Sets complete", { exact: true })).toHaveText(
    "1/24",
  );
  await page.getByRole("button", { name: "Undo last set" }).click();
  await expect(page.getByLabel("Set weight", { exact: true })).toHaveValue(
    "50",
  );
  await expect(page.getByLabel("Sets complete", { exact: true })).toHaveText(
    "0/24",
  );
  await page.getByRole("button", { name: "Set complete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rest" })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rest" })).toBeVisible();
  await page.screenshot({
    path: "test-results/" + info.project.name + "-guided-rest.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /^Next (set|exercise)$/, exact: true })
    .click();
  await expect(page.getByLabel("Set weight", { exact: true })).toHaveValue(
    "50",
  );
  await expect(page.getByRole("heading", { name: "Set 2 of 4" })).toBeVisible();
  for (let set = 2; set <= 4; set++) {
    await expect(
      page.getByLabel("Reps completed", { exact: true }),
    ).toHaveValue("10");
    await page
      .getByRole("button", { name: "Set complete", exact: true })
      .click();
    await page
      .getByRole("button", { name: /^Next (set|exercise)$/, exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Lat pulldown", exact: true }),
  ).toBeVisible();
  const names = [
    "Lat pulldown",
    "Leg press",
    "Dumbbell lateral raise",
    "Dumbbell biceps curl",
    "Ab crunch",
  ];
  for (const [index, name] of names.entries()) {
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    for (let set = 0; set < 4; set++) {
      await page.getByLabel("Set weight", { exact: true }).fill("20");
      await page
        .getByRole("button", { name: "Set complete", exact: true })
        .click();
      await page
        .getByRole("button", {
          name:
            index === 4 && set === 3
              ? "Review workout"
              : /^Next (set|exercise)$/,
          exact: true,
        })
        .click();
    }
  }
  await expect(
    page.getByRole("heading", { name: "All sets complete" }),
  ).toBeVisible();
  await expect(page.getByLabel("Sets complete", { exact: true })).toHaveText(
    "24/24",
  );
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workout saved" }),
  ).toBeVisible();
  await expect(
    page.getByText("Setup: seat: 4", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("guided machine replacement and plan navigation preserve completed sets", async ({
  page,
}) => {
  await begin(page);
  await page.getByLabel("Set weight", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Set complete", exact: true }).click();
  await page
    .getByRole("button", { name: /^Next (set|exercise)$/, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Machine occupied?", exact: true })
    .click();
  await page.getByLabel("Replacement machine").selectOption("m-press");
  await page.getByRole("button", { name: "Use this setup" }).click();
  await expect(
    page.getByRole("img", {
      name: "Incline chest press equipment illustration",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", {
      name: "Incline chest press equipment illustration",
    }),
  ).toBeVisible();
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
    page.locator(".live-exercise").first().getByRole("button", {
      name: "Uncheck Bench press set 1",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Back to workout" }).click();
  await expect(
    page.getByRole("heading", { name: "Lat pulldown", exact: true }),
  ).toBeVisible();
});

test("guided screens and simpler navigation remain accessible in both themes", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await begin(page);
  for (const phase of ["set", "rest"]) {
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
  await page
    .getByRole("button", { name: /^Next (set|exercise)$/, exact: true })
    .click();
  const light = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(light.violations.map((v) => v.id)).toEqual([]);
  await page.screenshot({
    path: "test-results/" + info.project.name + "-guided-light.png",
    fullPage: true,
  });
});
