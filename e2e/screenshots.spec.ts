import { test } from "@playwright/test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots");

// Visual review captures for the D12 human gate — not assertions.
test("capture: home empty (FR)", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: join(OUT, "01-home-fr.png"), fullPage: true });
});

test("capture: queue with mixed states", async ({ page }) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles([
      join(FIXTURES, "valid-3page.pdf"),
      join(FIXTURES, "markdown-rich.md"),
      join(FIXTURES, "pointer.gdoc"),
    ]);
  await page
    .getByLabel(/Convertir vers|Convert to/)
    .first()
    .selectOption("png");
  await page.getByLabel(/Convertir vers|Convert to/).nth(1).selectOption("pdf");
  await page.getByRole("button", { name: /Convertir tout|Convert all/ }).click();
  await page
    .getByRole("button", { name: /^(Télécharger|Download)$/ })
    .first()
    .waitFor({ timeout: 60_000 });
  await page.screenshot({ path: join(OUT, "02-queue-states.png"), fullPage: true });
});

test("capture: privacy page (FR)", async ({ page }) => {
  await page.goto("/");
  const privacyButton = page.getByRole("button", { name: /Confidentialité|Privacy/ });
  await privacyButton.click();
  await page.screenshot({ path: join(OUT, "03-privacy.png"), fullPage: true });
});
