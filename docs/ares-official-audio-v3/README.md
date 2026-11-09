# BOBU Ares Official Audio V3

Implemented on 2026-11-09 in `/private/tmp/bobunaut-ares-official-audio-v3`, branch `feature/ares-official-audio-v3`, from freshly fetched `origin/main` `2ee4e7c6bf13a30dc7b02b5bba1f72de03db4477`. Verified audio baseline 2ee4e7c and black-screen fix a720d9b ancestry. Existing main, Genesis V5 and previous arrival worktrees were not edited. No push, merge, deployment, OTA, migration or production-data write.

The approved6.35-second entrance recording replaces the runtime synthesized melody. Mission, Research and Upgrade use their distinct approved recordings. **Command audio is implemented and tested in the shared API but is not attached to production gameplay: no defined Command Console interaction exists.** Per the mission instruction, no fake button, proximity trigger or new gameplay action was invented.

- [Asset metadata](./asset-metadata.json), [source/integrity/complete-decode verification](./asset-validation.json)
- [Playback lifecycle and event mapping](./implementation.md)
- [Test evidence, limitations and manual steps](./validation.md)
- [Exact changed-file manifest](./changed-files.txt)
- [Protected source hashes](./evidence/protection.json)

## Integrated recordings

All files are byte-identical to the approved Downloads WAV/ZIP entries. Original stereo44.1kHz signed16-bit little-endian PCM WAV is retained; no resampling, encoding, remix, trimming, looping or replacement file was generated. Runtime context resampling is browser-managed, not a change to recordings. Native WAV support avoids decoder libraries and external CDNs.

Location: `public/audio/ares-official-v3/` (same-origin `/audio/ares-official-v3/`).

| Approved file | Duration | Bytes | Playback gain |
| --- | ---: | ---: | ---: |
| BOBU_Ares_Futuristic_Crystal_Resonance_V3_6s.wav |6.35s|1,120,184|0.18|
| BOBU_Mission_Console.wav |1.05s|185,264|0.50|
| BOBU_Research_Console.wav |1.05s|185,264|0.20|
| BOBU_Upgrade_Console.wav |1.10s|194,084|0.216|
| BOBU_Command_Console.wav |1.05s|185,264|0.366|

Combined payload1,870,060bytes (~1.87MB). The input ZIP CRC test, WAV sample/header counts, SHA-256 comparisons with approved originals and FFmpeg full decodes all passed. Metadata includes measured peak/RMS; console gains bring average levels near0.0078RMS without altering the source bytes. Entrance output peak is approximately0.072 before other audio. No automatic gain/compressor or pitch variation is applied.

Decoded cache is bounded to five buffers per existing shared context (~3.74MB float PCM at44.1kHz, ~4.07MB at48kHz, excluding existing ambience and browser overhead). No decoded global cache survives context teardown. This is a calculated buffer size, not a measured total browser memory claim.

## Remaining integration decision

`AresCommandCenterV2Visuals.tsx` labels `CommandConsole` architectural visuals only and provides no click/key/authorized action. The Hub upgrade panel is the actual upgrade action; it receives the Upgrade recording. A `COMMAND` label/type elsewhere is not a separate authorized console event and is not used to manufacture playback. Define that action in a separate gameplay task before wiring `aresArrivalSound.terminal("command")` after its guards. The four-recording API tests do not establish four existing production interactions.
