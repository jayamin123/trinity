import { test, expect } from "@playwright/test";

/**
 * Playwright E2E test for the Trinity UI.
 * Assumes the dev server is running on http://localhost:3040.
 * Assumes admin user exists (admin@trinity.local / trinity) — created by `npm run seed`.
 */

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@trinity.local");
  await page.getByLabel("Password").fill("trinity");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/", { timeout: 30_000 });
}

test.describe("Trinity full flow", () => {
  test("1. Login redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Trinity")).toBeVisible();
    await expect(page.getByText("Sign in to continue")).toBeVisible();
  });

  test("2. Wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@trinity.local");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Invalid email or password/)).toBeVisible({ timeout: 10_000 });
  });

  test("3. Correct password signs in and lands on dashboard", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
  });

  test("4. Sidebar nav reaches all pages", async ({ page }) => {
    await signIn(page);

    await page.getByRole("link", { name: "Cards" }).click();
    await expect(page.getByRole("heading", { name: "Cards", exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: "Automations" }).click();
    await expect(page.getByRole("heading", { name: "Automations" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: "Activity" }).click();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible({ timeout: 15_000 });

    // Settings via user-menu avatar (last button in app bar)
    await page.locator("header button").last().click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 15_000 });
  });

  test("5. Save CheckoutChamp credentials + test connection", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");

    // Always fill creds — page may show existing or fresh account
    await page.getByLabel("Account name").fill("Apollo");
    await page.getByLabel(/^Login ID/).fill("apolloreamaze");
    await page.getByLabel(/^Password/).fill("apolloreamaze");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

    // Now test connection
    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(page.getByText(/Connection OK/)).toBeVisible({ timeout: 60_000 });
  });

  test("6. Upload a CSV", async ({ page }) => {
    await signIn(page);
    await page.goto("/cards");

    const csv = `Card Number,Exp Month,Exp Year,Security Code,First Name,Last Name,Address,City,State,Zip Code,Phone Number,Email Address,IP Address
7711466356626600,12,2030,100,Pat,Test,1 Main St,Austin,TX,78701,5125550001,pat@test.com,203.0.113.1
7720278843100449,12,2030,900,Lee,Test,2 Main St,Austin,TX,78701,5125550002,lee@test.com,203.0.113.2
`;
    await page.setInputFiles('input[type="file"]', { name: "ui-test.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: /^Upload$/ }).click();

    await expect(page.getByText(/Imported \d+ cards?/)).toBeVisible({ timeout: 30_000 });
  });

  test("7. New automation form renders", async ({ page }) => {
    await signIn(page);
    await page.goto("/automations/new");

    await expect(page.getByLabel("Automation name")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/CheckoutChamp configuration/)).toBeVisible();
    await expect(page.getByLabel(/Transaction price/)).toBeVisible();
    await expect(page.getByLabel(/Number of cards/)).toBeVisible();
  });

  test("8. Add and delete a CheckoutChamp configuration in Settings", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");

    // The "CheckoutChamp configurations" section should be visible (account exists from earlier test)
    await expect(page.getByRole("heading", { name: /CheckoutChamp configurations/ })).toBeVisible({ timeout: 30_000 });

    // Click "Add configuration"
    await page.getByRole("button", { name: /Add configuration/ }).click();

    // Fill the form
    await page.getByLabel(/^Name/).fill("Playwright test config");

    // Pick first gateway
    await page.locator('label:has-text("Gateway") + div [role="combobox"]').first().click();
    await page.getByRole("option").first().click();

    // Pick first CC campaign
    await page.locator('label:has-text("CheckoutChamp campaign") + div [role="combobox"]').first().click();
    await page.getByRole("option").first().click();

    // Wait for products to load and pick the first
    await page.waitForTimeout(3000);
    await page.locator('label:has-text("Product") + div [role="combobox"]').first().click();
    await page.getByRole("option").first().click();

    // Save
    await page.getByRole("button", { name: /Save configuration/ }).click();
    await expect(page.getByText("Configuration saved.")).toBeVisible({ timeout: 30_000 });

    // Verify it appears in the table
    await expect(page.getByText("Playwright test config")).toBeVisible();

    // Delete it (use the delete button next to our config)
    const row = page.getByRole("row").filter({ hasText: "Playwright test config" });
    await row.getByLabel("Delete configuration").click();
    await expect(page.getByText("Configuration deleted.")).toBeVisible({ timeout: 10_000 });
  });
});
