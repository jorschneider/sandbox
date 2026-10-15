#!/usr/bin/env node
/**
 * Screenshot helper for the Kimi revision loop.
 *   node tools/screenshot.mjs <url> <outPrefix>
 * Writes <outPrefix>-desktop.png and <outPrefix>-mobile.png (full page).
 */
import { createRequire } from "node:module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const [url = "http://127.0.0.1:8000/", prefix = "shot"] = process.argv.slice(2);

const browser = await chromium.launch();
for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${prefix}-${name}.png`, fullPage: true });
  console.log(`${prefix}-${name}.png`);
  if (errors.length) console.log(`[${name}] JS errors:\n  ` + errors.join("\n  "));
  await page.close();
}
await browser.close();
