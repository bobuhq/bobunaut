# Validation and manual verification

## Executed results

| Check | Result / evidence |
| --- | --- |
| Approved ZIP, WAV integrity, metadata and source equality |5/5 full FFmpeg decodes; CRC, headers/sample counts, size, duration and SHA checks pass. [Asset validation](./asset-validation.json) |
| Existing17 lifecycle tests, migrated assertions |PASS: preserve StrictMode/remount, no gate allocation, suspended/rejected/late resume, mute, background/OS interruption, WebKit fallback, unsupported audio, handoff, spatial mix, cooldown, movement and backend failure assertions |
| New playback tests |PASS: four separate approved console playback/cooldown/ended/cache cleanup cases; full6.35-second arrival and native-ended handoff; missing asset fallback; pending-fetch navigation; pagehide cleanup |
| Asset and real-handler tests |PASS: five WAV/hash cases, four distinct files, actual extracted Mission/Research/Upgrade guards with stubbed RPCs, silent restore, explicit absent Command event, existing pointer-to-key mobile bridge |
| Combined Node suite |**36/36 PASS**, [output](./evidence/unit-tests.txt) |
| Desktop production-CSP browser |PASS: [results](./evidence/desktop.json) |
| Android-style WebView-compatible Chromium emulation |PASS: [results](./evidence/android.json) |
| iOS-style touch + webkitAudioContext fallback in Chromium |PASS: [results](./evidence/ios-fallback.json) |
| TypeScript + production build |PASS: `npm run build` includes `tsc -b`, Vite and25 SPA entries. [Log](./evidence/production-build.txt). Existing chunk-size/empty-chunk warnings are not silenced. |
| Source/scope/whitespace |Protected sources equal baseline, ambient implementation unchanged except removed beep, no dependency/SQL changes; [hashes](./evidence/protection.json). `git diff --check` and new-text trailing-space scan pass. |

Browser fixture uses actual route hooks, StrictMode, clip player, soundscape and movement engine with browser-native Web Audio. It hashes the bytes passed to decode and records the exact decoded recording used at source start. Checks cover blocked autoplay/no unsolicited resume, keyboard/mouse/native touch activation, full natural arrival end, unchanged spatial mix allocations, four API cues with cooldown, remount, repeated route entry, persistent mute/reload/unmute, simulated hidden/foreground, all contexts closed and zero active native sources after exit. Recorded requests are same-origin only and there are zero application console/page errors, new workers or CSP violations. No autoplay bypass flag is used; the test explicitly makes policy require activation.

Cleanup tests verify finite sources disconnect and null their buffers, all cache/pending/active/timer collections empty after mute, native ambience stops and context closure. This is bounded source/cache evidence, not a native-device heap/endurance benchmark. Visibility transitions in the fixture are simulated DOM visibility events, not real iOS/Android OS suspension.

Initial new source-structure assertion expected onClick for the unchanged mobile bridge; audit showed pointer-down/up handlers, so the assertion was corrected to the actual bridge. No production handler was changed to satisfy it. Final36-case run passes. No browser failures/retries occurred in the three recorded V3 profile runs.

## Not verified / remaining risks

- No physical iOS WKWebView, Android device/WebView or audio interruption/thermal/headphone test. The iOS profile uses Chromium and constructor fallback, **not actual WebKit**; no WebKit executable was available locally.
- No full authenticated Mars3D world/browser regression or successful backend mission/research/upgrade transaction executed. Protected scene/camera/collision/terminal geometry sources remain byte-identical. Fixture does not prove all production runtime combinations or black-screen absence on hardware.
- Command Console lacks a production action. Four distinct recordings/API paths exist, but only three console types currently have gameplay hooks. Do not report the four-console success condition as fully met.
- Slow/failed asset loads can skip a console cue; missing arrival skips to ambience. There is no synthesized fallback. Original WAVs add1.87MB of static payload. Per-context decoded caches are bounded and released, but real-device memory/loading performance needs verification.
- Playback gains are calculated from source RMS/peak and tested for scheduling, not listener-certified on phone speakers. Confirm subjective balance with real-device volume controls and preserved ambience.

## Reproduction

```sh
cd /private/tmp/bobunaut-ares-official-audio-v3
node --test tests/mars/arrival-sound.test.mjs tests/mars/official-audio-v3.test.mjs
npm run build
node tests/mars/arrival-sound.browser.mjs --profile=desktop
node tests/mars/arrival-sound.browser.mjs --profile=android
node tests/mars/arrival-sound.browser.mjs --profile=ios-fallback
git diff --check
```

Browser runner defaults to existing `/private/tmp/bobu-browser-tools/node_modules/playwright/index.mjs` and system Google Chrome; override `PLAYWRIGHT_MODULE`/`CHROME_PATH` if necessary. It builds to a new temporary directory and serves only the audio fixture and approved public files on loopback with the captured production CSP. No backend or authenticated app is invoked. `production-csp.txt` was captured via read-only headers on 2026-11-09, not changed on the live site.

## Manual steps

1. Start local Vite (`npm run dev -- --host 127.0.0.1`), open `/tests/mars/arrival-sound.html` in a fresh browser profile. Confirm silence until permitted gesture, then compare the entrance with the approved Downloads WAV at low volume. Hear the complete6.35seconds once, followed by existing quiet ambience. This dev URL is not a production route.
2. Exercise rerender/remount, route exit/back, mute/reload/unmute and hide/show controls. No unexpected entrance replay; exiting/muting stops clips. Test keyboard activation, mouse and real touch. Fixture Command button tests only audio API, not a game action.
3. In an authorized local/staging Mars session, approach Mission/Research/Upgrade; confirm no proximity or restore sounds. Use actual valid interactions; each appropriate recording plays once. Confirm Research start and completed archive behavior, disabled/distant/busy guards and repeated clicks. Do not spend production resources for testing.
4. Walk exterior→Hub→reactor→away; verify ambience/crossfade/resonance and movement sounds. Leave during entrance/console playback; no orphan playback or black screen. Verify terminals and camera behind consoles without new workers/CSP violations.
5. Repeat on physical iOS/Android WebViews: portrait/landscape, background, screen lock, OS interruption, headphones and returning through navigation. Check one running context, no replay after background, no accumulation over20 entries and no unwanted autoplay resume. Record build/device/OS/WebView version, console/CSP and memory evidence.

No push, merge, deployment, OTA or database write is authorized or performed by this task.
