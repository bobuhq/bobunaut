# BOBU Ares Arrival Sound V1

Historical arrival-only implementation/validation record. The cue is preserved
unchanged; its controller is now extended by [Ares Audio Experience V1](./ares-audio-experience-v1.md).
The new experience keeps ambience alive after arrival and restores the bed on
unmute. See the linked report for current lifecycle behavior and test results.

Implemented from stable production `a720d9bb01236099c3037a1b051c30dc6e300a3e` on
`feat/ares-arrival-sound-v1` in `/private/tmp/bobunaut-ares-sound`.

## Sound and behavior

An original 3.7-second Web Audio synthesis, with nine short-lived sine voices:
a quiet E/B harmonic bed, a soft E5 → B5 → E6 bell gesture, faint bell partials,
and slowly detuned crystal shimmer. Master gain fades in over 180 ms and fades
out to silence. There are no samples, copyrighted recordings, external fonts,
audio files, workers, reverb libraries, music loops or network dependencies.
The WAV below is a **test-rendered preview**, not a runtime dependency.

The persistent route observer in `App` distinguishes entering `/mars/explore`
from re-rendering/remounting its content. The sound is armed only when
`MarsExploreScene` commits after its access/loading/portrait gates and scene
Suspense resolve. It does not add a new Suspense boundary or promise to render.
Search parameter updates, movement, terminal state, StrictMode replay and
surface remounts cannot replay a consumed entry. Leaving and returning, including
history Back to the same route key, creates a new eligible arrival.

If the browser starts the context suspended, the cue waits for a trusted
pointer, touch-end or keyboard interaction. `resume()` is invoked directly in
that handler. Rejection is caught and can retry only on another interaction;
there are no autoplay workarounds or retry timers. Mute-control and navigation
link presses do not accidentally trigger a pending arrival. Unsupported audio
skips without affecting exploration.

The existing small Mars sound button controls both arrival and movement audio.
Its preference persists under `bobu:ares:sound-enabled:v1`; blocked storage falls
back to memory. Muting cancels/consumes the pending or playing arrival. Unmuting
is not a replay button; the next genuine entry is eligible. Muted movement
handlers no longer allocate/resume AudioContexts, and rejected movement-audio
resumes are caught.

On unmount/navigation, pending resumes are invalidated and arrival nodes fade
out for 50 ms, disconnect, and close their context within about 65 ms. Natural
completion also closes the context. A hidden/page-hidden surface drops the
cue instead of playing a surprise sound on return. A foreground OS audio
interruption also closes the cue rather than queuing a late continuation. The short arrival context
is separate from movement audio so completing the cue cannot silence footsteps.

## Exact changed files

| File | Purpose |
| --- | --- |
| `src/app/App.tsx` | Two-line import/hook integration for persistent route entry tracking |
| `src/core/mars/exploration/MarsExploreWorld.tsx` | Surface-ready attachment, persistent existing sound control, accessible pressed state |
| `src/core/mars/exploration/audio/AresArrivalSynth.ts` | Original finite synthesis, envelopes and node disposal |
| `src/core/mars/exploration/audio/AresArrivalSound.ts` | Route lifetime, autoplay, mute, cancellation and cleanup |
| `src/core/mars/exploration/audio/useAresArrivalSound.ts` | React route/surface hooks and shared sound preference |
| `src/core/mars/exploration/audio/MarsAudioEngine.ts` | Respect mute before unlocking; catch unsupported/rejected autoplay |
| `tests/mars/arrival-sound.test.mjs` | 14 lifecycle and compatibility tests |
| `tests/mars/arrival-sound.browser.mjs` | Production fixture build, real Web Audio/autoplay tests, offline waveform render |
| `tests/mars/arrival-sound.tsx` | StrictMode/router/surface/control fixture using actual implementation hooks |
| `tests/mars/arrival-sound.html` | Browser fixture entry |
| `docs/ares-arrival-sound-v1.md` | This implementation and validation report |

All collision, V4.1 architecture, NASA isolation and the production Troika
black-screen fix files are unchanged from `a720d9b`. No GP, Wallet, X OAuth,
Supabase, SQL, Mining, package manifest or lockfile changes. The original
checkout and its modified/untracked work were left intact. The isolated
worktree uses ignored symlinks to the original dependencies/environment; their
contents were not changed or exposed.

## Results

| Check | Result |
| --- | --- |
| `npm run build` (`tsc -b` + Vite + route generation) | PASS; existing chunk-size/empty optional chunk warnings only |
| `node --test tests/mars/arrival-sound.test.mjs` | 14/14 PASS |
| `git diff --check` | PASS |
| Desktop Chrome, strict document-user-activation autoplay policy | PASS; initially suspended, 0 starts/0 resume calls; trusted keyboard input starts exactly 9 voices |
| Android WebView UA + touch emulation in Chromium | PASS; suspended until trusted touch; no duplicate cue from pointer/touch event sequence |
| iOS UA + touch + real AudioContext via `webkitAudioContext` fallback in Chromium | PASS; same lifecycle/autoplay assertions |
| Entry, terminal-style updates, remount, leave/Back, repeated entry | PASS; one cue per entry, including Back to a prior history key |
| Mute during playback, stored mute after reload, unmute, new entry | PASS |
| Late resume after navigation/remount, rejected resume, unsupported API/storage | PASS |
| Completion/unmount/mute/navigation cleanup | PASS; contexts closed and sources disconnected, no extra scheduled playback |
| CSP/errors/dependencies in browser fixture | 0 CSP violations, page errors, workers or external requests |
| Offline waveform | Peak `0.04614` (about −26.7 dBFS), full-render RMS `0.00780`; final tail exactly silent; no clipping or loop |

Artifacts from the final browser run:

- Results: `/var/folders/qn/1325m1n13115hqtb783n4z_m0000gn/T/bobu-arrival-audio-m4xEjX/results.json`
- Listen: `/var/folders/qn/1325m1n13115hqtb783n4z_m0000gn/T/bobu-arrival-audio-m4xEjX/BOBU-Ares-Arrival-V1-preview.wav`
- Logs: `/private/tmp/bobu-arrival-unit.log`, `/private/tmp/bobu-arrival-browser.log`, `/private/tmp/bobu-arrival-build.log`

These are local browser/fixture tests, not an authenticated gameplay session or
a deployment test. Chromium emulation and WebKit-constructor testing do not
replace listening on physical iOS/Android devices. Device volume, iOS audio
session/silent-mode behavior and WebView host audio policy still need a device
smoke test. The implementation handles unavailable/suspended audio gracefully.

## Reproduce and review

From the isolated worktree:

```sh
node --test tests/mars/arrival-sound.test.mjs
npm run build
git diff --check
```

The optional browser tests use Playwright installed outside the repository:

```sh
PLAYWRIGHT_MODULE=/private/tmp/bobu-browser-tools/node_modules/playwright/index.mjs node tests/mars/arrival-sound.browser.mjs
```

Set `CHROME_PATH` if Chrome is elsewhere. The test builds with the repository's
production Vite config and serves a restrictive CSP, using no three.js scene or
authenticated services. It prints a fresh artifact directory, including a WAV
rendered from the actual synthesis.

For gameplay/device review, preview on a free port (leaving 4173 alone):

```sh
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

1. With an authorized test account, enter `/mars/explore?sector=ares`. Listen
   after the surface appears; if blocked, touch the surface or press movement.
2. Move around and open/close terminal panels. Confirm no repeat or black screen.
3. Mute while playing and while awaiting a gesture; reload and confirm mute
   remains. Unmute and confirm no restart of this entry's cue.
4. Return to orbit, re-enter, and test history Back. Each new unmuted entry
   should sound once. Leave mid-cue and confirm the smooth cancellation.
5. On iOS and Android WebView, repeat with a fresh session, screen rotation,
   app background/foreground and device audio controls. Blocked audio should
   remain silent or wait for a genuine gesture, never interfere with movement.

No push, merge, deploy, publish or migration was performed.
