# BOBU Ares Audio Experience V1

Extends the existing arrival implementation in `/private/tmp/bobunaut-ares-sound`,
on `feat/ares-arrival-sound-v1`, based on stable `a720d9b`. Existing arrival work
was retained. No new checkout, reset or overwrite of the original repository's
uncommitted files was performed.

## Experience

- **Arrival:** the existing original 3.7-second signature synthesis is unchanged.
  SHA-256 of `AresArrivalSynth.ts` before and after this extension:
  `270015e73d61f8350407326ae5c73c699c99820372cddf3ae163b0abdd5bccf8`.
  Route-entry deduplication, surface-ready mounting and autoplay handling remain.
- **Exterior:** after arrival finishes, the same context introduces the bed over
  2.5 seconds: very low-level 72/108.1 Hz texture, two filtered procedural wind
  layers with different playback rates and slowly modulated filters. Native
  oscillators/filtering avoid streamed assets or JS audio processing.
- **Sparse accents:** isolated quiet harmonic glints at randomized 13–30-second
  intervals, not a melody or fixed metronome. Finite voices disconnect on end.
- **Hub:** complementary exterior/interior gain targets crossfade with a 0.65 s
  time constant (about two seconds to settle). The technological room tone uses
  soft 196/294.15 Hz harmony. It reuses the hub's actual existing inside test.
- **Reactor:** the existing `BobuEnergyCore` group and player are sampled with
  `getWorldPosition`, at most about eight times per second. The reactor is at
  local `[-2.5, 1.25, -1.4]` under the hub at `[-44, terrain + .05, -68]`, so its
  current X/Z are `[-46.5, -69.4]`; the implementation does not hardcode that
  derived world point. Resonance is strongest within 2 m, falls quadratically
  to zero at 8 m, and is gated to the hub interior. The gain glides smoothly;
  distance samples do not create sources.
- **Terminals:** accepted Mission access, Research analysis-start and Research
  archive-open actions trigger discreet, distinct two-voice cues. These hook
  directly into existing guarded action handlers, before their async requests.
  They are neutral interaction sounds, not success/reward confirmations. No
  cue is played by proximity, restores, render effects, progress polling or
  frames. A shared 1.2 s cooldown and slight voicing variation prevent spam.
  Interactions during the arrival itself stay silent so the signature has space.
- **Mute/exit:** the existing persistent sound button controls everything.
  Unmute restores ambience without replaying the arrival. Arrival and movement
  fade over 50 ms; the bed fades over 180 ms. Continuous sources also receive
  native scheduled stops, so a frozen JS close timer cannot leave loops running.
  Context/node cleanup completes after the fade (within about 195 ms).
- **Background/interruption:** hiding the document/page immediately releases
  active and retiring contexts, including buffers/timers. Returning starts only
  ambience, waiting for a trusted interaction again if required by the host.
  OS audio interruption also releases the graph. Arrival never resumes halfway.

The arrival controller retains its existing name/API for compatibility, but now
owns the complete experience lifecycle. Movement audio borrows its running
context through a provider; it cannot allocate a competing engine. A remount
can restore the bed but cannot replay a consumed arrival. A retiring context is
released before any replacement is allocated. Terminal and spatial API failures
are contained so they cannot crash React, interrupt a mission handler or escape
from R3F's frame loop.

Steady-state cost: eight continuous oscillators (including two slow filter
modulators), two noise sources sharing one synthesized mono buffer, roughly
1.43 MiB of buffer samples, and one sparse JS timer. No worklets, workers,
heavy libraries, downloads or audio network requests. Layered noise rates and
slow modulation avoid a noticeable short weather loop; the white-noise buffer
has no distinct boundary event after filtering. Short interaction, sparse and
movement sources stop and disconnect independently rather than accumulating.

## Files changed by this extension

| File | Change |
| --- | --- |
| `src/core/mars/exploration/audio/AresSoundscape.ts` | New native synthesis graph, crossfades, attenuation, sparse/terminal voices and cleanup |
| `src/core/mars/exploration/audio/AresArrivalSound.ts` | Extend the existing route controller with continuous playback, shared context, mix/event APIs and background lifecycle |
| `src/core/mars/exploration/audio/MarsAudioEngine.ts` | Borrow the shared context; track, fade and release finite movement sources |
| `src/core/mars/exploration/commandhub/AresCommandHub.tsx` | Existing inside signal and real player/reactor world transforms feed the audio mixer |
| `src/core/mars/exploration/missions/AresMissionTerminal.tsx` | One call on accepted Mission interaction |
| `src/core/mars/exploration/research/AresResearchTerminal.tsx` | One call on explicit archive interaction |
| `src/core/mars/exploration/research/useAresResearchTerminal.ts` | One call on explicit guarded analysis start |
| `tests/mars/arrival-sound.test.mjs` | Extend arrival tests for ambience, source stops, context sharing, attenuation and backend failure containment |
| `tests/mars/arrival-sound.tsx` | Extend the existing fixture with mix, distance, interaction and movement controls |
| `tests/mars/arrival-sound.browser.mjs` | Real Web Audio lifecycle/profile tests, source-count soak and original/full-experience WAV previews |
| `docs/ares-audio-experience-v1.md` | This report |
| `docs/ares-arrival-sound-v1.md` | Mark the previous report as historical arrival-only validation |

The existing `App.tsx`, `MarsExploreWorld.tsx`, arrival synthesis, React audio
hooks and HTML test entry were retained from Arrival V1. The previous route
observer and existing small sound control continue to be used.

Collision geometry, removed foundation, NASA isolation and Troika-free beacon
fix are unchanged. No GP, Wallet, X OAuth, Supabase, SQL, Mining, package manifest
or dependency lock changes were made. Audio calls do not change terminal
authorization, RPCs, research/mission state transitions, rewards or persistence.

## Validation

| Check | Result |
| --- | --- |
| `npm run build` (TypeScript + production Vite + route generation) | PASS; existing chunk-size/optional-empty-chunk warnings only |
| `node --test tests/mars/arrival-sound.test.mjs` | 17/17 PASS |
| `git diff --check` | PASS |
| Desktop native Web Audio + restrictive document-activation policy | PASS |
| Android WebView UA/touch emulation in Chromium | PASS |
| iOS UA/touch plus real Web Audio through the `webkitAudioContext` fallback in Chromium | PASS |
| Initial blocked autoplay | Zero tones/resume attempts before a trusted gesture |
| Entry, StrictMode replay, updates, remount, exit/Back and repeated entry | No duplicate arrival; one continuing live context |
| Exterior/interior/reactor changes | No new source allocation from mix changes; attenuation/interior gating tested |
| Rapid Mission/Research actions | One two-voice cue within the cooldown, then a new cue on a later action |
| Movement while ambient is active | Uses the same context |
| Mute persistence, unmute, navigation | Bed resumes without an arrival replay; all contexts close on exit/mute |
| Hidden page, OS interruption, stale resume, API failure | Handled without scene/terminal errors; no paused arrival continuation |
| Cleanup when JS is frozen | Unit assertions verify native continuous-source stops are scheduled before the close timer |
| Short desktop soak | One running context; bounded live sources; finite interaction voices end |
| Browser console/CSP/network | Zero page errors, workers, CSP violations or external audio requests |
| Arrival waveform | Original peak `0.04614`; final tail silent |
| Full experience preview | Peak below 0.05; exterior/interior RMS below 0.005; exit tail exactly silent |

The browser harness serves the actual modules as a production Vite build with a
restrictive CSP. Profiles run separately. Initial combined/long-idle runs lost
their browser connection before completion; independent runs passed. This is
a short lifecycle/source-count soak, not a multi-hour endurance test.

Native Safari, physical Android/iOS WebView audio sessions, headphones/device
volume, and authenticated 3D gameplay have **not** been verified. Chromium UA,
touch and constructor emulation is not a native-device test. Optional audio
failure remains silent and cannot block exploration. A device listening and
gameplay smoke test is still the release acceptance step.

## Repeat and listen

From `/private/tmp/bobunaut-ares-sound`:

```sh
node --test tests/mars/arrival-sound.test.mjs
npm run build
git diff --check
```

Browser tooling remains outside the repository. Run each profile separately:

```sh
export PLAYWRIGHT_MODULE=/private/tmp/bobu-browser-tools/node_modules/playwright/index.mjs
node tests/mars/arrival-sound.browser.mjs --profile=desktop
node tests/mars/arrival-sound.browser.mjs --profile=android
node tests/mars/arrival-sound.browser.mjs --profile=ios-fallback
```

Each prints its artifact directory with `results.json`. The desktop run also
renders `BOBU-Ares-Arrival-V1-preview.wav` and
`BOBU-Ares-Audio-Experience-V1-preview.wav`. The 24-second experience preview
uses the actual graph: arrival, exterior, interior/reactor, two terminal cues,
exterior with a sample of the sparse voicing, then exit. The offline preview
uses a deterministic sparse accent; live accents retain randomized timing.
WAVs are review artifacts, not shipped runtime assets.

Recorded review artifacts:

- Desktop results and both WAVs: `/var/folders/qn/1325m1n13115hqtb783n4z_m0000gn/T/bobu-arrival-audio-6IeCiV/`
- Android results: `/var/folders/qn/1325m1n13115hqtb783n4z_m0000gn/T/bobu-arrival-audio-DfNegh/results.json`
- iOS constructor-fallback results: `/var/folders/qn/1325m1n13115hqtb783n4z_m0000gn/T/bobu-arrival-audio-Y2wIP4/results.json`

Logs: `/private/tmp/bobu-experience-unit.log`,
`/private/tmp/bobu-experience-build.log`,
`/private/tmp/bobu-experience-desktop.log`,
`/private/tmp/bobu-experience-android.log`,
`/private/tmp/bobu-experience-ios-fallback.log`.

For authorized gameplay review, use a free preview port, leaving 4173 alone:

```sh
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

1. Enter Ares, allow the signature to finish, and listen for the quiet exterior
   bed. Test a fresh autoplay-blocked session using keyboard and touch.
2. Walk through the hub doorway repeatedly; verify gradual room/exterior
   transitions without an arrival replay or source multiplication.
3. Approach/leave the actual purple reactor. Verify resonance falls off by
   about eight metres and does not bleed into the exterior mix.
4. Use Mission, start authorized Research, and open its archive. Stand near
   terminals without interacting and confirm silence from interaction cues.
   Rapid input must not produce a repeating alarm or cue stream.
5. Mute/unmute, reload, leave/re-enter, rotate/remount, use history Back and
   background/foreground the app. Confirm persistent mute, no arrival replay
   on ordinary updates, graceful gesture handling and no background audio.
6. Leave mid-cue and mid-ambience; confirm smooth exit and no continuing audio.
   Check browser console, network and native WebView audio-session behavior.

No push, merge, deploy, publish or migration was performed.
