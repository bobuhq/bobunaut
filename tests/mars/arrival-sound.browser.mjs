// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/mars/arrival-sound.browser.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const output = await mkdtemp(join(tmpdir(), "bobu-arrival-audio-"));
const dist = join(output, "dist");
await build({ publicDir: false, build: { outDir: dist, rollupOptions: { input: "tests/mars/arrival-sound.html" } } });
const csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'";
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/favicon.ico") { res.writeHead(204).end(); return; }
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript" }[extname(path)] || "application/octet-stream");
    res.setHeader("Content-Security-Policy", csp);
    res.end(await readFile(join(dist, path)));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true, args: ["--autoplay-policy=document-user-activation-required",
    "--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies"] });
const results = [];
browser.on("disconnected", () => console.log("Browser disconnected"));
try {
  const selectedProfile = process.argv.find(value => value.startsWith("--profile="))?.split("=")[1] || "desktop";
  assert(["desktop", "android", "ios-fallback"].includes(selectedProfile));
  for (const profile of [selectedProfile]) {
    const mobile = profile !== "desktop";
    const context = await browser.newContext(mobile ? {
      isMobile: true, hasTouch: true, viewport: { width: 844, height: 390 },
      userAgent: profile === "android"
        ? "Mozilla/5.0 (Linux; Android 14; BOBU-Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 wv"
        : "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BOBU-Mobile",
    } : {});
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("crash", () => console.log(`PAGE CRASH: ${profile}`));
    page.on("worker", worker => errors.push(`Unexpected worker: ${worker.url()}`));
    page.on("request", request => requests.push(request.url()));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(useWebkitFallback => {
      window.__audioContexts = [];
      window.__violations = [];
      document.addEventListener("securitypolicyviolation", e => window.__violations.push(e.effectiveDirective));
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) {
          super(...args);
          this.stats = { starts: 0, buffers: 0, ended: 0, resumes: 0, closes: 0 };
          window.__audioContexts.push(this);
        }
        createOscillator() {
          const oscillator = super.createOscillator();
          const start = oscillator.start.bind(oscillator);
          oscillator.start = (...args) => { this.stats.starts++; return start(...args); };
          oscillator.addEventListener("ended", () => this.stats.ended++);
          return oscillator;
        }
        createBufferSource() {
          const source = super.createBufferSource();
          const start = source.start.bind(source);
          source.start = (...args) => { this.stats.buffers++; return start(...args); };
          source.addEventListener("ended", () => this.stats.ended++);
          return source;
        }
        resume() { this.stats.resumes++; return super.resume(); }
        close() { this.stats.closes++; return super.close(); }
      };
      if (useWebkitFallback) {
        window.webkitAudioContext = window.AudioContext;
        delete window.AudioContext;
      }
    }, profile === "ios-fallback");
    const url = `http://127.0.0.1:${server.address().port}/tests/mars/arrival-sound.html`;
    const tap = async selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
    const stats = () => page.evaluate(() => window.__audioContexts.map(c => ({ ...c.stats, state: c.state })));
    const starts = async () => (await stats()).reduce((sum, c) => sum + c.starts, 0);
    await page.goto(url);
    await page.waitForSelector("#surface");
    await page.waitForTimeout(150);
    assert.equal(await starts(), 0, "Blocked autoplay must not schedule tones");
    assert((await stats()).every(c => c.resumes === 0), "No resume outside a user gesture");
    const blockedAutoplay = await stats();
    if (mobile) await tap("#gesture");
    else await page.keyboard.press("w");
    await page.waitForTimeout(100);
    assert.equal(await starts(), 9);
    const afterTrustedGesture = await stats();
    for (let i = 0; i < 3; i++) await tap("#render");
    await tap("#remount");
    await page.waitForTimeout(150);
    assert.equal(await starts(), 17, "Remount starts only the 8 continuous oscillators, not the 9-voice arrival");
    assert.equal((await stats()).filter(c => c.state === "running").length, 1);
    await tap("#leave");
    await tap("#back"); // POP to the same history key is a genuine new entry.
    await page.waitForSelector("#surface");
    await tap("#gesture");
    await page.waitForTimeout(100);
    assert.equal(await starts(), 26, "A genuine re-entry must replay once");
    await page.waitForTimeout(3850);
    assert.equal(await starts(), 34, "Arrival hands off to ambience in the same context");
    assert.equal((await stats()).filter(c => c.state === "running").length, 1);
    const beforeMix = await starts();
    await tap("#hub"); await tap("#crystal"); await tap("#far"); await tap("#outside");
    assert.equal(await starts(), beforeMix, "Spatial/mix changes do not allocate sources");
    await tap("#mission"); await tap("#mission"); await tap("#research");
    assert.equal(await starts(), beforeMix + 2, "Rapid accepted events are throttled");
    await page.waitForTimeout(1300); await tap("#research");
    assert.equal(await starts(), beforeMix + 4);
    await tap("#step");
    await page.waitForTimeout(150);
    assert.equal((await stats()).filter(c => c.state === "running").length, 1, "Movement shares the experience context");
    if (!mobile) {
      for (let sample = 0; sample < 3; sample++) {
        await page.waitForTimeout(4500);
        console.log(JSON.stringify({ soak: sample, contexts: await stats() }));
      }
      const active = (await stats()).filter(c => c.state === "running");
      assert.equal(active.length, 1);
      assert(active[0].starts + active[0].buffers - active[0].ended <= 12, "Finite cues and sparse tones release their sources over time");
    }
    await tap("#sound");
    await page.reload();
    await page.waitForSelector("#surface");
    assert.equal(await page.locator("#sound").getAttribute("aria-pressed"), "false");
    await tap("#gesture");
    assert.equal(await starts(), 0, "Mute persists across reload");
    await tap("#sound");
    await tap("#gesture");
    assert.equal(await starts(), 8, "Unmute restores ambience without replaying arrival");
    await tap("#leave"); await tap("#enter"); await tap("#gesture");
    await page.waitForTimeout(100);
    assert.equal(await starts(), 17);
    await tap("#sound");
    await page.waitForTimeout(240);
    assert((await stats()).filter(c => c.starts > 0).every(c => c.state === "closed"), "Mute fades and closes active arrivals");
    await tap("#leave");
    await page.waitForTimeout(100);
    assert((await stats()).every(c => c.state === "closed"), "Navigation releases all contexts");

    if (!mobile) {
      const rendered = await page.evaluate(async () => {
        const offline = new OfflineAudioContext(1, 48000 * 4, 48000);
        window.synthesizeAresArrival(offline);
        const buffer = await offline.startRendering();
        const samples = buffer.getChannelData(0);
        let peak = 0, squares = 0, finalPeak = 0;
        for (let i = 0; i < samples.length; i++) {
          peak = Math.max(peak, Math.abs(samples[i]));
          squares += samples[i] ** 2;
          if (i > 48000 * 3.75) finalPeak = Math.max(finalPeak, Math.abs(samples[i]));
        }
        return { peak, rms: Math.sqrt(squares / samples.length), finalPeak, samples: Array.from(samples) };
      });
      assert(rendered.peak > 0.005 && rendered.peak < 0.12, "Low-level cue without clipping");
      assert.equal(rendered.finalPeak, 0, "Cue ends in silence rather than looping");
      const wav = Buffer.alloc(44 + rendered.samples.length * 2);
      wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
      wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
      wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
      rendered.samples.forEach((value, index) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2));
      await writeFile(join(output, "BOBU-Ares-Arrival-V1-preview.wav"), wav);
      delete rendered.samples;
      results.push({ waveform: rendered });

      // Render actual synthesis through an exterior -> interior -> reactor ->
      // terminal -> exterior -> exit itinerary. Offline checkpoints use the
      // same gain updates as live gameplay, without changing the arrival file.
      const experience = await page.evaluate(async () => {
        const rate = 24000;
        const offline = new OfflineAudioContext(1, rate * 24, rate);
        const arrival = window.synthesizeAresArrival(offline);
        let bed;
        const checkpoints = [3.8, 10, 13, 15, 18, 22].map(time => offline.suspend(time).then(() => {
          if (time === 3.8) { arrival.dispose(); bed = new window.AresSoundscape(offline); bed.setMix(false, 0); }
          if (time === 10) bed.setMix(true, 1);
          if (time === 13) bed.terminal("mission");
          if (time === 15) bed.terminal("research");
          if (time === 18) {
            bed.setMix(false, 0);
            // Deterministic offline sample of the live scheduler's sparse
            // voicing. The real soundscape keeps its random 13–30 s timing.
            bed.note(493.88, 0.004, 3.4, bed.exterior);
          }
          if (time === 22) bed.fadeOut();
          void offline.resume();
        }));
        const buffer = await offline.startRendering();
        await Promise.all(checkpoints);
        bed.dispose();
        const samples = buffer.getChannelData(0);
        const rms = (from, to) => {
          let sum = 0;
          for (let i = from * rate; i < to * rate; i++) sum += samples[i] ** 2;
          return Math.sqrt(sum / ((to - from) * rate));
        };
        let peak = 0;
        for (const value of samples) peak = Math.max(peak, Math.abs(value));
        return { rate, peak, exteriorRms: rms(7, 9), interiorCrystalRms: rms(11, 12), exitRms: rms(23, 24), samples: Array.from(samples) };
      });
      assert(experience.exteriorRms > 0 && experience.exteriorRms < 0.012);
      assert(experience.interiorCrystalRms > 0 && experience.interiorCrystalRms < 0.012);
      assert.equal(experience.exitRms, 0);
      assert(experience.peak < 0.12);
      const preview = Buffer.alloc(44 + experience.samples.length * 2);
      preview.write("RIFF", 0); preview.writeUInt32LE(preview.length - 8, 4); preview.write("WAVEfmt ", 8);
      preview.writeUInt32LE(16, 16); preview.writeUInt16LE(1, 20); preview.writeUInt16LE(1, 22);
      preview.writeUInt32LE(experience.rate, 24); preview.writeUInt32LE(experience.rate * 2, 28);
      preview.writeUInt16LE(2, 32); preview.writeUInt16LE(16, 34); preview.write("data", 36); preview.writeUInt32LE(preview.length - 44, 40);
      experience.samples.forEach((value, index) => preview.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2));
      await writeFile(join(output, "BOBU-Ares-Audio-Experience-V1-preview.wav"), preview);
      delete experience.samples;
      results.push({ experienceWaveform: experience });
    }
    assert.deepEqual(await page.evaluate(() => window.__violations), []);
    assert.deepEqual(errors, []);
    assert(requests.every(url => url.startsWith(`http://127.0.0.1:${server.address().port}/`)), "No external audio/network dependency");
    results.push({ profile, engine: "Chrome / Chromium (mobile and WebKit constructor fallback are emulated)",
      result: "PASS", blockedAutoplay, afterTrustedGesture, contexts: await stats(), errors });
    await context.close();
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ output, results }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
