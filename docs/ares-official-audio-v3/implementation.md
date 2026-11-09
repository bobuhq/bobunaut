# Playback implementation and lifecycle

## Shared ownership

`AresArrivalSound` remains the owner of route-entry identity, surface leases, persistent preference `bobu:ares:sound-enabled:v1`, trusted gesture handling, visibility/pagehide and OS interruption cleanup. The existing movement engine still obtains this owner's running context. No new AudioContext owner, audio library, worklet, text worker, scene-wide Suspense, Html lifecycle or render-loop state update was added.

`AresOfficialAudio` belongs to that same context. It loads five same-origin assets once per context, deduplicates requests and decodes through `decodeAudioData`. Loading never calls resume. Optional decode/loading failure is silent; a missing arrival falls through to the unchanged soundscape without a substitute melody. A context-local cache avoids repeated decode during console interactions. Fetches have a ten-second bound and are aborted at teardown; browser-native in-flight decoding cannot be cancelled, so stale results are discarded by disposed/identity guards. No retry timer loop is used.

## Entry and handoff

1. Only committed Ares surface attachment schedules startup. Deferred startup preserves StrictMode behavior; an access/loading gate creates no audio.
2. Browser-blocked contexts remain suspended until a permitted trusted pointer/touch/key interaction invokes resume synchronously. No synthetic unlock, muted-media trick or relaxed autoplay flag. Browser resume rejection waits for a later genuine gesture.
3. A running context consumes that route entry once and waits for the approved arrival buffer. A loading guard prevents duplicate async requests/playback. Before starting, it rechecks context/entry identity, surface lease, mute and visibility.
4. Full6.35-second buffer starts once at playbackRate1, loop=false. Low gain,10ms opening envelope and final40ms closing envelope prevent edge clicks; the stored recording is untouched. Handoff uses native source `ended`, replacing the old3.7-second JS deadline. On natural end the source disconnects, clears its buffer reference and starts one unchanged soundscape, whose existing2.5-second fade-in remains.
5. Rerenders and same-route surface remounts never replay arrival. A remount may recreate ambience after closing the old context, preserving the original lifecycle. Leaving the route resets entry eligibility; a genuine subsequent entry can play once again.
6. Mute consumes a pending entry, preserves persistent preference and closes audio after a short fade; unmute restores ambience without arrival. Native stops are scheduled, so cleanup does not depend only on JS while freezing. Hidden/pagehide/OS interruption stops immediately, closes sources/context and never queues a resumed partial melody. Foreground can restore ambience using existing gesture rules.

Exit cancels fetch/decode ownership, stops and disconnects all finite voices, clears timers/maps and releases the shared context. Normal fade closes after65ms for recordings alone or195ms when ambience exists. Existing wind/drone/sparse tones, interior crossfade, crystal-distance mix and footsteps/jump are preserved. `AresSoundscape` differs only by removal of its now-replaced generic terminal-beep method and two associated fields; protection evidence verifies the remaining source is identical.

The legacy `AresArrivalSynth.ts` is retained unchanged as historical code but has no runtime or fixture import; it is not a fallback or an overlapping theme.

## Event mapping

| Kind | Approved effect | Production event / guard |
| --- | --- | --- |
| Mission |BOBU_Mission_Console.wav|Existing `AresMissionTerminal.accessTerminal`: nearby and not busy, invoked by interaction key; existing mobile pointer bridge dispatches that key. No proximity-loop call.|
| Research |BOBU_Research_Console.wav|Existing `beginResearch`: claimed mission, nearby and ready/error; existing completed-research archive interaction retains its cue. Removed erroneous cue from restore/unavailable effect.|
| Upgrade |BOBU_Upgrade_Console.wav|Existing upgrade button's `handleUpgrade`, after nearby/server-returned can_upgrade/not-upgrading guard. Native HTML click supports mouse, touch and keyboard activation.|
| Command |BOBU_Command_Console.wav|Shared API ready; **no production event connected**, because CommandConsole is decorative geometry. Fixture button is explicitly API-test-only.|

Cues acknowledge accepted UI interaction requests, not successful server transactions. RPCs remain authoritative and unchanged; a rejected request still reports its existing UI failure. No resource/reward authorization is added to client audio. Test handler extraction stubs all RPCs and never spends actual inventory/resources.

A single1.2-second context-time cooldown across console types suppresses double handlers and near-simultaneous duplicate input. Console clips are at most1.1seconds, avoiding overlapping console playback. Clips may play quietly over arrival/ambience. Hidden/muted/suspended contexts do not play. If a console buffer is not ready, skip that cue instead of queuing a stale interaction; startup preloads minimize this window. Mute/exit stops active console clips too.
