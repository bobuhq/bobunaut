# Original BOBU campus audio

Generated locally for this project, without third-party recordings or melodies.

- `campus-interior-original.wav`: original 32-second overlapping four-chord ambient composition; 22,050 Hz mono PCM16. Runtime asynchronously decodes this bundled score into the existing unlocked ARES AudioContext, then fades it using the existing mute lifecycle. Composition generation never runs inside a movement frame. It never restarts at corridor segment boundaries.
- `campus-door-open-original.wav` / `campus-door-close-original.wav`: review renders of the existing deterministic ARES mechanical slide/seal and pneumatic noise synthesis. Runtime keeps using those shared original buffers; flight and terminal recordings are not replaced.

Reproduce with `node scripts/generate-campus-audio.mjs`. These original generated assets may be used and modified with the BOBU project. No external audio files were downloaded.
