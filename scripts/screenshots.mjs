#!/usr/bin/env node
// Visual check with a private headless Chromium (never a person's browser): screenshots of the
// start page and three answers at phone and desktop widths, light and dark, into scratch/shots/.
//   PLAYWRIGHT=/path/to/playwright-core node scripts/screenshots.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { server } from "../server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "playwright-core");
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
mkdirSync("scratch/shots", { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const problems = [];
for (const [w, h] of [[390, 844], [1024, 768]]) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && problems.push(`${w} ${scheme} console: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`${w} ${scheme} pageerror: ${e.message}`));
    await page.goto(base);
    await page.waitForSelector("#chips button");
    await page.screenshot({ path: `scratch/shots/${w}-${scheme}-start.png`, fullPage: true });
    for (const item of ["pizza box", "AA batteries", "juice box", "laptop"]) {
      await page.fill("#item", item);
      await page.press("#item", "Enter");
      await page.waitForSelector("#answer:not([hidden]) .verdict");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) problems.push(`${w} ${scheme} "${item}": horizontal overflow ${overflow}px`);
      await page.screenshot({ path: `scratch/shots/${w}-${scheme}-${item.replace(/\s+/g, "-")}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(problems.length ? problems.join("\n") : "no console errors, no horizontal overflow");
