import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "playwright");
const fixturesDir = path.join(rootDir, "tests", "fixtures");
const baseUrl = process.env.BROWSER_TEST_URL ?? "http://127.0.0.1:4173";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function runDesktopFlow(browser) {
  const context = await browser.newContext({
    viewport: {
      width: 1440,
      height: 960,
    },
  });
  const page = await context.newPage();
  const consoleMessages = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleMessages.push(message.text());
    }
  });

  await page.route("https://nominatim.openstreetmap.org/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";
    const body = JSON.stringify([
      {
        place_id: 101,
        lat: "22.2759",
        lon: "114.1450",
        display_name: `${query} Mock Result, Central and Western District, Hong Kong`,
      },
    ]);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "01-library-empty.png"), fullPage: true });

  const importInput = page.locator('input[type="file"]').first();
  await importInput.setInputFiles([
    path.join(fixturesDir, "half-frame.png"),
    path.join(fixturesDir, "single-negative.png"),
  ]);
  await page.waitForFunction(() => document.querySelectorAll(".asset-card").length >= 2);
  await page.screenshot({ path: path.join(outputDir, "02-library-imported.png"), fullPage: true });

  await page.getByRole("button", { name: /Remove Selected|移除所选/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".asset-card").length === 0);
  await page.screenshot({ path: path.join(outputDir, "03-library-removed.png"), fullPage: true });

  await importInput.setInputFiles([
    path.join(fixturesDir, "half-frame.png"),
    path.join(fixturesDir, "single-negative.png"),
  ]);
  await page.waitForFunction(() => document.querySelectorAll(".asset-card").length >= 2);
  await page.screenshot({ path: path.join(outputDir, "04-library-reimported.png"), fullPage: true });

  await page.getByRole("link", { name: /Crop Adjust|Crop Adjustments|剪裁调整/ }).click();
  await page.getByRole("button", { name: /Auto Detect Halves|自动识别半格/ }).click();
  await page.waitForFunction(() => {
    const text = document.body.textContent ?? "";
    return !text.includes("识别置信度: -") && !text.includes("Detection Confidence: -");
  });
  const leftRotation = page.getByLabel(/Left Rotation|左图旋转/);
  await leftRotation.fill("3");
  await page.screenshot({ path: path.join(outputDir, "05-split-adjusted.png"), fullPage: true });

  await page.getByRole("link", { name: /Color|调色/ }).click();
  await page.waitForSelector(".lab-preview__image");
  await page.getByLabel(/Preset Name|预设名称/).fill("Regression Preset");
  await page.getByRole("button", { name: /Save as Preset|保存为预设/ }).click();
  await page.locator(".preset-list__item").first().click();
  await page.screenshot({ path: path.join(outputDir, "06-lab-preset.png"), fullPage: true });

  await page.getByRole("link", { name: /Image Info|图片信息/ }).click();
  await page.waitForURL(/#\/metadata/);
  await page.locator('.panel--form input[type="datetime-local"]').fill("2026-03-18T18:45");
  await page.locator('.panel--form input').nth(1).fill("Olympus Pen FT");
  await page.locator('.panel--form input').nth(2).fill("Noritsu HS-1800");
  await page.getByRole("button", { name: /Pick on Map|地图选点/ }).click();
  await page.locator(".modal input").first().fill("Victoria Peak");
  await page.getByRole("button", { name: /Search Place|搜索地点/ }).click();
  await page.waitForSelector(".map-search-results__item");
  await page.locator(".map-search-results__item").first().click();
  await page.getByRole("button", { name: /Use Current Center|使用当前中心点/ }).click();
  await page.getByRole("button", { name: /Apply Metadata|应用元数据/ }).click();
  await page.screenshot({ path: path.join(outputDir, "07-metadata-applied.png"), fullPage: true });

  await page.getByRole("link", { name: /Export|导出/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Start Export|开始导出/ }).click();
  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();
  const downloadPath = path.join(outputDir, suggestedFilename);
  await download.saveAs(downloadPath);
  await page.screenshot({ path: path.join(outputDir, "08-export.png"), fullPage: true });
  assert(suggestedFilename.endsWith(".zip"), `Expected ZIP export, received ${suggestedFilename}`);
  assert(consoleMessages.length === 0, `Browser console errors detected: ${consoleMessages.join(" | ")}`);

  await context.close();
  return {
    screenshots: [
      "01-library-empty.png",
      "02-library-imported.png",
      "03-library-removed.png",
      "04-library-reimported.png",
      "05-split-adjusted.png",
      "06-lab-preset.png",
      "07-metadata-applied.png",
      "08-export.png",
    ],
    download: suggestedFilename,
  };
}

async function runMobileCheck(browser) {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "07-mobile-home.png"), fullPage: true });
  await context.close();

  return {
    screenshot: "07-mobile-home.png",
  };
}

async function main() {
  await ensureDir(outputDir);
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await runDesktopFlow(browser);
    const mobile = await runMobileCheck(browser);

    await writeJson(path.join(outputDir, "browser-regression-report.json"), {
      baseUrl,
      completedAt: new Date().toISOString(),
      desktop,
      mobile,
      status: "passed",
    });
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  await ensureDir(outputDir);
  await writeJson(path.join(outputDir, "browser-regression-report.json"), {
    baseUrl,
    completedAt: new Date().toISOString(),
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  });
  console.error(error);
  process.exitCode = 1;
});
