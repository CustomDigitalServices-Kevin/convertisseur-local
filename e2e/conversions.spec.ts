import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// One real conversion per family (PDF, image, office) through the actual UI,
// real worker, real WASM chunks — this is the coverage the unit tests could
// not provide under Node/happy-dom (documented in each converter's tests).

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures");

async function convertFixture(
  page: Page,
  fixtureFile: string,
  targetValue: string,
): Promise<Download> {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(join(FIXTURES, fixtureFile));
  await page.getByLabel(/Convertir vers|Convert to/).selectOption(targetValue);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Convertir tout|Convert all/ }).click();
  await page
    .getByRole("button", { name: /^(Télécharger|Download)$/ })
    .click({ timeout: 60_000 });
  return downloadPromise;
}

async function downloadedBytes(download: Download): Promise<Buffer> {
  const path = await download.path();
  return readFileSync(path);
}

test("PDF family: converts a real 3-page PDF to PNG images (zip)", async ({ page }) => {
  const download = await convertFixture(page, "valid-3page.pdf", "png");
  const bytes = await downloadedBytes(download);
  // 3 pages -> multiple files -> the UI packages them as a ZIP (PK header).
  expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");
  expect(bytes.length).toBeGreaterThan(1000);
});

test("image family: converts a real PNG to WebP", async ({ page }) => {
  const download = await convertFixture(page, "tiny.png", "webp");
  const bytes = await downloadedBytes(download);
  expect(bytes.subarray(0, 4).toString("latin1")).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString("latin1")).toBe("WEBP");
});

test("office family: converts a real DOCX to a PDF with extractable size", async ({ page }) => {
  const download = await convertFixture(page, "sample.docx", "pdf");
  const bytes = await downloadedBytes(download);
  expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
  expect(bytes.length).toBeGreaterThan(500);
});

test("conversions happen with zero external network requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://localhost")) external.push(request.url());
  });
  await convertFixture(page, "tiny.png", "jpeg");
  expect(external).toEqual([]);
});
