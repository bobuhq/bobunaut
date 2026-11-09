// Isolated real browser/Web Audio regression. Mobile and WebKit fallback are Chromium emulation.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "/private/tmp/bobu-browser-tools/node_modules/playwright/index.mjs").href);
const profile = process.argv.find(arg => arg.startsWith("--profile="))?.split("=")[1] || "desktop";
assert(["desktop", "android", "ios-fallback"].includes(profile));
const output = await mkdtemp(join(tmpdir(), "bobu-official-v3-")), dist = join(output, "dist");
await build({ publicDir: false, build: { outDir: dist, rollupOptions: { input: "tests/mars/arrival-sound.html" } } });
const csp = (await readFile("docs/ares-official-audio-v3/production-csp.txt", "utf8")).trim();
const metadata = JSON.parse(await readFile("docs/ares-official-audio-v3/asset-metadata.json", "utf8"));
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/favicon.ico") { res.writeHead(204).end(); return; }
    assert(!path.includes(".."));
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".wav": "audio/wav" }[extname(path)] || "application/octet-stream");
    res.setHeader("Content-Security-Policy", csp);
    res.end(await readFile(join(path.startsWith("/audio/") ? "public" : dist, path)));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true, args: ["--autoplay-policy=document-user-activation-required", "--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies"] });
try {
  const mobile = profile !== "desktop";
  const context = await browser.newContext(mobile ? { isMobile: true, hasTouch: true, viewport: { width: 844, height: 390 }, userAgent: profile === "android"
    ? "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 wv"
    : "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BOBU-Mobile" } : {});
  const page = await context.newPage(), errors = [], requests = [], checks = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("worker", worker => errors.push(`Unexpected worker: ${worker.url()}`));
  page.on("request", request => requests.push(request.url()));
  await page.addInitScript(({ fallback, hashes }) => {
    window.__audioContexts = []; window.__violations = [];
    document.addEventListener("securitypolicyviolation", e => window.__violations.push(e.effectiveDirective));
    const Native = window.AudioContext, names = new WeakMap();
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); this.stats = { starts: 0, buffers: 0, ended: 0, resumes: 0, files: [], active: 0 }; window.__audioContexts.push(this); }
      async decodeAudioData(bytes) {
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(v => v.toString(16).padStart(2, "0")).join("");
        const buffer = await super.decodeAudioData(bytes); names.set(buffer, hashes[hash]); return buffer;
      }
      createOscillator() {
        const node = super.createOscillator(), start = node.start.bind(node);
        node.start = (...args) => { this.stats.starts++; this.stats.active++; return start(...args); };
        node.addEventListener("ended", () => { this.stats.ended++; this.stats.active--; }); return node;
      }
      createBufferSource() {
        const node = super.createBufferSource(), start = node.start.bind(node);
        node.start = (...args) => { this.stats.buffers++; this.stats.active++; if (names.has(node.buffer)) this.stats.files.push(names.get(node.buffer)); return start(...args); };
        node.addEventListener("ended", () => { this.stats.ended++; this.stats.active--; }); return node;
      }
      resume() { this.stats.resumes++; return super.resume(); }
    };
    if (fallback) { window.webkitAudioContext = window.AudioContext; delete window.AudioContext; }
  }, { fallback: profile === "ios-fallback", hashes: Object.fromEntries(metadata.map(m => [m.sha256, m.file])) });
  const tap = selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
  const stats = () => page.evaluate(() => window.__audioContexts.map(c => ({ ...c.stats, state: c.state })));
  const count = async file => (await stats()).flatMap(s => s.files).filter(f => f === file).length;
  const arrival = "BOBU_Ares_Futuristic_Crystal_Resonance_V3_6s.wav";
  const waitArrival = n => page.waitForFunction(({ file, n }) => window.__audioContexts.flatMap(c => c.stats.files).filter(f => f === file).length === n, { file: arrival, n });
  await page.goto(`http://127.0.0.1:${server.address().port}/tests/mars/arrival-sound.html`);
  await page.waitForSelector("#surface"); await page.waitForTimeout(200);
  assert.equal(await count(arrival), 0); assert((await stats()).every(c => c.resumes === 0)); checks.push("blocked autoplay: no resume/playback");
  if (mobile) await tap("#gesture"); else await page.keyboard.press("w");
  await waitArrival(1);
  for (let i = 0; i < 3; i++) await tap("#render");
  assert.equal(await count(arrival), 1); checks.push("trusted gesture, StrictMode and rerenders: one exact approved arrival");
  await page.waitForFunction(() => window.__audioContexts.some(c => c.stats.starts === 8), undefined, { timeout: 10000 });
  assert.equal((await stats()).filter(c => c.state === "running").length, 1); checks.push("natural full arrival end -> ambience in shared context");
  const beforeMix = (await stats()).map(c => c.starts + c.buffers).reduce((a, b) => a + b, 0);
  for (const selector of ["#hub", "#crystal", "#far", "#outside"]) await tap(selector);
  assert.equal((await stats()).map(c => c.starts + c.buffers).reduce((a, b) => a + b, 0), beforeMix); checks.push("spatial mix updates allocate no sources");
  for (const [kind, file] of [["mission", "BOBU_Mission_Console.wav"], ["research", "BOBU_Research_Console.wav"], ["upgrade", "BOBU_Upgrade_Console.wav"], ["command", "BOBU_Command_Console.wav"]]) {
    await page.waitForTimeout(1250);
    // Keyboard activation on desktop, native touch on the mobile profiles.
    if (!mobile) { await page.locator(`#${kind}`).focus(); await page.keyboard.press("Enter"); } else await tap(`#${kind}`);
    await page.waitForFunction(file => window.__audioContexts.some(c => c.stats.files.includes(file)), file);
    await tap(`#${kind}`); assert.equal(await count(file), 1); checks.push(`${kind}: exact recording hash, duplicate suppressed`);
  }
  await page.waitForTimeout(1250); await tap("#step"); await page.waitForTimeout(300);
  assert.equal((await stats()).filter(c => c.state === "running").length, 1); checks.push("movement still shares context");
  await tap("#remount"); await page.waitForTimeout(300);
  assert.equal(await count(arrival), 1); assert.equal((await stats()).filter(c => c.state === "running").length, 1); checks.push("surface remount: ambience only, old context closed");
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.waitForTimeout(100); assert((await stats()).every(c => c.state === "closed"));
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
  await tap("#gesture"); await page.waitForTimeout(200); assert.equal(await count(arrival), 1); checks.push("simulated hidden/foreground: cleanup, no arrival replay");
  await tap("#leave"); await tap("#back"); await page.waitForSelector("#surface"); await tap("#gesture"); await waitArrival(2); checks.push("genuine route re-entry replays once");
  await tap("#sound"); await page.waitForTimeout(240); assert((await stats()).every(c => c.state === "closed"));
  const beforeMute = await count(arrival); await tap("#mission"); assert.equal(await count(arrival), beforeMute);
  const preReload = await stats();
  await page.reload(); await page.waitForSelector("#surface"); await tap("#gesture");
  assert.equal(await page.locator("#sound").getAttribute("aria-pressed"), "false"); assert.deepEqual(await stats(), []);
  await tap("#sound"); await page.waitForFunction(() => window.__audioContexts.some(c => c.stats.starts === 8));
  assert.equal(await count(arrival), 0); checks.push("persistent mute; unmute restores ambience without arrival");
  await tap("#leave"); await page.waitForTimeout(300);
  assert((await stats()).every(c => c.state === "closed" && c.active === 0)); checks.push("exit: all scheduled sources ended, all contexts closed");
  assert.deepEqual(await page.evaluate(() => window.__violations), []); assert.deepEqual(errors, []);
  assert(requests.every(url => url.startsWith(`http://127.0.0.1:${server.address().port}/`)));
  const result = { profile, result: "PASS", engine: "Chromium; mobile/WebKit constructor fallback emulated, not physical WebView", checks, preReload, final: await stats(), errors, csp, requests };
  await writeFile(join(output, "results.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify({ output, ...result }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
