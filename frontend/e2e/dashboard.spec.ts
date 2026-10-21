import { test, expect } from "@playwright/test";
import type { Detail } from "../src/types";

test.beforeEach(async ({ page, request }) => {
  const match: Detail = await (
    await request.get("/api/matches/ind-aus")
  ).json();
  const restarted = await request.post("/api/matches/ind-aus/restart", {
    data: { expectedRevision: match.match.revision },
  });
  expect(restarted.ok()).toBeTruthy();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Inside the boundary." }),
  ).toBeVisible();
  await expect(page.locator(".huge-score")).toBeVisible();
});

test("dashboard displays scores from the API and switches matches", async ({
  page,
  request,
}) => {
  const detail: Detail = await (
    await request.get("/api/matches/ind-aus")
  ).json();
  await expect(page.locator(".huge-score")).toContainText(
    `${detail.match.score}/${detail.match.wickets}`,
  );
  await page
    .getByRole("button", {
      name: "View England versus South Africa",
      exact: true,
    })
    .click();
  await expect(page.locator(".batting-label h3")).toHaveText("England");
  await expect(page.locator(".scoreboard-venue")).toContainText("St Lucia");
});

test("filters fixtures and opens the upcoming squad", async ({ page }) => {
  await page
    .locator(".filters")
    .getByRole("button", { name: /Upcoming/ })
    .click();
  await expect(page.locator(".match-card")).toHaveCount(2);
  await page
    .getByRole("button", {
      name: "View Pakistan versus New Zealand",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pakistan squad" }),
  ).toBeVisible();
  await expect(page.locator(".upcoming-panel")).toContainText("Babar Azam");
  await expect(
    page.getByRole("button", { name: "Scorer's desk", exact: true }),
  ).toHaveCount(0);
});

test("search finds a match and Escape closes the dialog", async ({ page }) => {
  await page.getByRole("button", { name: "Find a match", exact: true }).click();
  await page.getByRole("textbox", { name: "Search matches" }).fill("Pakistan");
  await expect(page.locator(".search-results>button")).toHaveCount(1);
  await page.locator(".search-results>button").click();
  await expect(page.locator(".batting-label h3")).toHaveText("New Zealand");
  await page.getByRole("button", { name: "Find a match", exact: true }).click();
  await page.getByRole("textbox", { name: "Search matches" }).press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("bookmarks persist across reloads", async ({ page }) => {
  await page
    .getByRole("button", { name: "Save IND vs AUS", exact: true })
    .click();
  await page.getByRole("button", { name: /My boundary/ }).click();
  await expect(page.locator(".match-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /My boundary/ }).click();
  await expect(page.locator(".match-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Unsave IND vs AUS", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Keep your favourites close." }),
  ).toBeVisible();
});

test("scorecard has both innings and commentary filters boundaries", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Full scorecard", exact: true }).click();
  await expect(page.locator(".innings-switch>button")).toHaveCount(2);
  await expect(
    page.locator(".scorecard-panel .full-table").first().locator("tbody tr"),
  ).toHaveCount(11);
  await page.locator(".innings-switch>button").first().click();
  await expect(page.locator(".bowling-title")).toContainText("India");
  await page.getByRole("tab", { name: "Ball by ball", exact: true }).click();
  await page.getByRole("button", { name: "boundaries", exact: true }).click();
  const labels = await page
    .locator(".commentary-row .ball-chip")
    .allTextContents();
  expect(labels.length).toBeGreaterThan(0);
  expect(labels.every((label) => ["4", "6"].includes(label))).toBeTruthy();
});

test("scorer records an extra, free hit, boundary and undo", async ({
  page,
  request,
}) => {
  const before: Detail = await (
    await request.get("/api/matches/ind-aus")
  ).json();
  await page
    .getByRole("button", { name: "Scorer's desk", exact: true })
    .click();
  await page.getByRole("button", { name: /No ball/ }).click();
  await expect(page.locator(".scorer-success")).toBeVisible();
  await expect(page.locator(".free-hit")).toBeVisible();
  await expect(page.locator(".wicket-button")).toBeDisabled();
  await page
    .getByRole("button", { name: "Record 4 runs", exact: true })
    .click();
  await expect(page.locator(".scorer-score>strong")).toHaveText(
    `${before.match.score + 5}/${before.match.wickets}`,
  );
  await expect(page.locator(".free-hit")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Undo last delivery", exact: true })
    .click();
  await expect(page.locator(".scorer-score>strong")).toHaveText(
    `${before.match.score + 1}/${before.match.wickets}`,
  );
  const after: Detail = await (
    await request.get("/api/matches/ind-aus")
  ).json();
  expect(after.match.balls).toBe(before.match.balls);
  expect(after.match.autoPlay).toBe(false);
});

test("SSE delivers an external score update without a page reload", async ({
  page,
  request,
}) => {
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "Score desk connected",
  );
  const before: Detail = await (
    await request.get("/api/matches/ind-aus")
  ).json();
  const response = await request.post("/api/matches/ind-aus/deliveries", {
    data: {
      requestId: crypto.randomUUID(),
      outcome: "RUN",
      runs: 6,
      expectedRevision: before.match.revision,
    },
  });
  expect(response.ok()).toBeTruthy();
  await expect(page.locator(".huge-score")).toContainText(
    `${before.match.score + 6}/${before.match.wickets}`,
    { timeout: 5000 },
  );
});

test("player leaders are searchable and the schedule opens a match", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Player index", exact: true }).click();
  await expect(page.locator(".player-hero")).toBeVisible();
  await page.getByRole("textbox", { name: "Search players" }).fill("Kohli");
  await expect(page.locator(".players-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Bowling leaders", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search players" })
    .fill("xyz-no-player");
  await expect(
    page.getByText("No players match", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.locator(".schedule-row")).toHaveCount(6);
  await page.locator(".schedule-row").first().click();
  await expect(page.locator(".scoreboard")).toBeVisible();
});

test("layout fits the viewport and has no uncaught JavaScript errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await page
    .getByRole("button", { name: "About this demo", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("This is a simulation.");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  expect(errors).toEqual([]);
});
