import { expect, test } from "@playwright/test";

// Proof of the PWA promise: after one online visit, the app fully works
// offline — including a real conversion, whose WASM chunks must come from
// the Service Worker cache.
test("app converts a file while offline after first load", async ({ page, context }) => {
  await page.goto("/");
  // Wait for the service worker to take control of the page.
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active !== null;
  });
  // Warm the runtime: precache is done at SW install, no conversion needed yet.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("local-banner")).toBeVisible();

  // Real conversion with zero network available.
  await page
    .locator('input[type="file"]')
    .setInputFiles("tests/fixtures/tiny.png");
  await page.getByLabel(/Convertir vers|Convert to/).selectOption("jpeg");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Convertir tout|Convert all/ }).click();
  await page
    .getByRole("button", { name: /^(Télécharger|Download)$/ })
    .click({ timeout: 60_000 });
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpe?g$/);
  await context.setOffline(false);
});
