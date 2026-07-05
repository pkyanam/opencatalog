import { expect, test } from "@playwright/test";

test.describe("opencatalog.sh smoke", () => {
  test("homepage loads with hero and search", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("The map from paid software");
    await expect(page.locator(".search-trigger")).toBeVisible();
    await expect(page.locator(".stats-strip")).toBeVisible();
    await expect(page.locator(".escape-routes")).toBeVisible();
    await expect(page.locator(".agent-card")).toBeVisible();
  });

  test("homepage search palette opens with /", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    await expect(page.locator(".palette")).toBeVisible();
    await expect(page.locator(".palette-input-row input")).toBeFocused();
  });

  test("homepage search palette opens with cmd+k", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Meta+k");
    await expect(page.locator(".palette")).toBeVisible();
  });

  test("paid product page renders switch map and ranked board", async ({ page }) => {
    await page.goto("/notion/");
    await expect(page.locator("h1")).toContainText("Notion");
    await expect(page.locator(".switch-map-table")).toBeVisible();
    await expect(page.locator(".ranked-board")).toBeVisible();
    await expect(page.locator(".known-gaps")).toBeVisible();
    await expect(page.locator(".agent-card")).toBeVisible();
    // Should mention both alternatives in the ranked board
    await expect(page.locator(".ranked-board .ranked-name").first()).toBeVisible();
    await expect(page.locator(".ranked-board .ranked-name").nth(1)).toBeVisible();
  });

  test("switch map cell click opens proof drawer", async ({ page }) => {
    await page.goto("/notion/");
    // Click a workflow fit cell in the switch map
    const cell = page.locator(".switch-map-table .cell-proof").first();
    await cell.click();
    await expect(page.locator(".proof-drawer")).toBeVisible();
    await expect(page.locator(".proof-drawer h2")).toContainText("Proof");
  });

  test("alternative page renders install paths and maturity", async ({ page }) => {
    await page.goto("/alt/logseq/");
    await expect(page.locator("h1")).toContainText("Logseq");
    await expect(page.locator("text=install paths")).toBeVisible();
    await expect(page.locator(".code-block").first()).toBeVisible();
    await expect(page.locator("text=maturity signals")).toBeVisible();
    await expect(page.locator("text=known gaps")).toBeVisible();
  });

  test("category page lists paid products and alternatives", async ({ page }) => {
    await page.goto("/category/note-taking/");
    await expect(page.locator("h1")).toContainText("Note-taking");
    await expect(page.locator(".route-name").first()).toBeVisible();
    await expect(page.locator(".route-grid").first()).toBeVisible();
  });

  test("license page shows OSI status and requirements", async ({ page }) => {
    await page.goto("/license/agpl-3.0/");
    await expect(page.locator("h1")).toContainText("GNU Affero General Public License");
    await expect(page.locator(".chip-accent").first()).toBeVisible();
    await expect(page.locator(".sec-label", { hasText: "network deployment note" })).toBeVisible();
  });

  test("browse page lists all entity types", async ({ page }) => {
    await page.goto("/browse/");
    await expect(page.locator("h1")).toContainText("Browse the catalog");
    await expect(page.locator(".sec-label", { hasText: "paid products" })).toBeVisible();
    await expect(page.locator(".sec-label", { hasText: "FOSS alternatives" })).toBeVisible();
    await expect(page.locator(".sec-label", { hasText: "categories" })).toBeVisible();
    await expect(page.locator(".sec-label", { hasText: "licenses" })).toBeVisible();
  });

  test("about page explains trust model", async ({ page }) => {
    await page.goto("/about/");
    await expect(page.locator("h1")).toContainText("About opencatalog.sh");
    await expect(page.locator("text=trust model")).toBeVisible();
    await expect(page.locator("text=for agents")).toBeVisible();
  });

  test("api.json returns valid JSON envelope", async ({ request }) => {
    const res = await request.get("/api.json");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.schemaVersion).toBeDefined();
    expect(body.paidProducts).toBeInstanceOf(Array);
    expect(body.alternatives).toBeInstanceOf(Array);
    expect(body.paidProducts.length).toBeGreaterThan(0);
  });

  test("api.schema.json returns valid JSON Schema", async ({ request }) => {
    const res = await request.get("/api.schema.json");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("object");
    expect(body.properties).toBeDefined();
  });

  test("navigation works from homepage to paid product", async ({ page }) => {
    await page.goto("/");
    await page.locator(".route-card").first().click();
    await expect(page).toHaveURL(/\/[^/]+\/$/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("breadcrumbs render on detail pages", async ({ page }) => {
    await page.goto("/notion/");
    await expect(page.locator(".crumb")).toBeVisible();
    await expect(page.locator(".crumb")).toContainText("opencatalog.sh");
  });

  test("footer renders with api.json link", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer.site-footer")).toBeVisible();
    await expect(page.locator("footer.site-footer a[href='/api.json']")).toBeVisible();
  });
});
