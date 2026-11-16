/**
 * Runs the browser checks in real Chrome: the protocol/element harness and the 24-goblin zoo.
 *   bun run build:lib && bun run build:site && bun tests/browser/run.ts
 * Uses an installed Chrome (or CHROME_PATH); serves the repo on a local port.
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const server = Bun.serve({
  port: 0,
  fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p.startsWith("/site/")) p = "/dist-site/" + p.slice(6);
    const f = Bun.file(root + p.slice(1));
    return f.size ? new Response(f) : new Response("not found", { status: 404 });
  },
});
const base = `http://localhost:${server.port}`;
const exe = process.env.CHROME_PATH ?? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = false;

try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const watch = (pg: typeof page) => pg.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) errors.push(`${r.status()} ${r.url()}`); });
  watch(page);
  await page.goto(`${base}/tests/browser/harness.html`);
  await page.waitForFunction(() => document.title === "PASS" || document.title === "FAIL", null, { timeout: 120000 });
  const report = JSON.parse(await page.locator("#result").textContent() ?? "{}");
  for (const [name, v] of Object.entries<any>(report.checks)) {
    const pass = v === true || v?.pass === true;
    if (!pass) failed = true;
    console.log(`${pass ? "pass" : "FAIL"}  ${name}${pass || v === false ? "" : `  ${JSON.stringify(v.info)}`}`);
  }
  const zoo = await browser.newPage();
  zoo.on("pageerror", (e) => errors.push(e.message));
  watch(zoo);
  await zoo.setViewportSize({ width: 1400, height: 1100 });
  await zoo.goto(`${base}/site/zoo.html`);
  // wait until sequences are visibly advancing (state changes reported), however slow the GPU is
  await zoo.waitForFunction(() => Number(document.getElementById("events")?.textContent) >= 24, null, { timeout: 120000 }).catch(() => {});
  const stats = await zoo.evaluate(() => ({ ctx: document.getElementById("ctx")?.textContent, live: document.getElementById("live")?.textContent, fps: document.getElementById("fps")?.textContent, events: document.getElementById("events")?.textContent, canvases: document.querySelectorAll("canvas").length }));
  const zooOk = stats.ctx === "1" && stats.live === "24" && stats.canvases === 24 && Number(stats.events) > 0;
  if (!zooOk) failed = true;
  console.log(`${zooOk ? "pass" : "FAIL"}  zoo: 24 live goblins on one WebGL context  ${JSON.stringify(stats)}`);
  if (process.env.SHOT) await zoo.screenshot({ path: process.env.SHOT });
  if (errors.length) { failed = true; console.log("page errors:", errors); }
} finally {
  await browser.close();
  server.stop();
}
process.exit(failed ? 1 : 0);
