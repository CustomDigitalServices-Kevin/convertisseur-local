import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// v2 families through the real UI, real worker, real WASM/JS codecs — the
// coverage the converter teams documented as impossible under Node/happy-dom.

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures");

async function convertFixture(
  page: Page,
  fixtureFile: string,
  targetValue: string,
): Promise<Download> {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(join(FIXTURES, fixtureFile));
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

test("markdown family: converts a rich Markdown file to a real PDF", async ({ page }) => {
  const download = await convertFixture(page, "markdown-rich.md", "pdf");
  const bytes = await downloadedBytes(download);
  expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
  expect(bytes.length).toBeGreaterThan(500);
});

test("markdown family: extracts Markdown from a real PDF (preview badge shown)", async ({
  page,
}) => {
  const download = await convertFixture(page, "sample-text.pdf", "md");
  const bytes = await downloadedBytes(download);
  expect(bytes.length).toBeGreaterThan(10);
  await expect(page.getByText(/Aperçu|Preview/).first()).toBeVisible();
});

test("data family: converts YAML to JSON with preserved types", async ({ page }) => {
  const download = await convertFixture(page, "config.yaml", "json");
  const parsed: unknown = JSON.parse((await downloadedBytes(download)).toString("utf8"));
  expect(parsed).toMatchObject({ app: "convertisseur", version: 2, enabled: true });
});

test("image family v2: converts a real TIFF to PNG", async ({ page }) => {
  const download = await convertFixture(page, "tiny.tiff", "png");
  const bytes = await downloadedBytes(download);
  expect(Array.from(bytes.subarray(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test("dropping a .gdoc shows the cloud-pointer explanation instead of converting", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(join(FIXTURES, "pointer.gdoc"));
  await expect(
    page.getByText(/raccourci vers le cloud|shortcut to the cloud/).first(),
  ).toBeVisible();
});
