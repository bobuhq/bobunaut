import { getAresVoiceGain } from "./AresVoiceProximity";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
} from "livekit-client";

import { supabase } from "../../../../lib/supabase";

interface VoiceCredentials {
  url: string;
  token: string;
  generationId: string;
  expiresIn: number;
}

const VOICE_HEARTBEAT_INTERVAL_MS = 30_000;
const VOICE_HEARTBEAT_TIMEOUT_MS = 10_000;

const VOICE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getVoiceBuilderId(
  identity: string,
): string | null {
  const parts = identity.split(":");

  if (
    parts.length !== 2 ||
    !VOICE_UUID_PATTERN.test(parts[0]) ||
    !VOICE_UUID_PATTERN.test(parts[1])
  ) {
    return null;
  }

  return parts[0].toLowerCase();
}

export type VoiceBackendClient = typeof supabase;

export class AresColonyVoiceEngine {
  constructor(
    private readonly backend: VoiceBackendClient = supabase,
  ) {}

  private room: Room | null = null;
  private pendingRoom: Room | null = null;
  private connecting = false;
  private generation = 0;

  private heartbeatTimer:
    ReturnType<typeof setTimeout> | null = null;

  private heartbeatAbort:
    AbortController | null = null;

  private lastError: string | null = null;

  get connectionError(): string | null {
    return this.lastError;
  }

  private isCurrentRoom(
    room: Room,
    lifecycle: number,
  ): boolean {
    return (
      this.room === room &&
      this.generation === lifecycle
    );
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.heartbeatAbort?.abort();
    this.heartbeatAbort = null;
  }

  private async verifyHeartbeat(
    room: Room,
    lifecycle: number,
    generationId: string,
  ): Promise<boolean> {
    if (
      !this.isCurrentRoom(room, lifecycle) ||
      this.heartbeatAbort
    ) {
      return false;
    }

    const controller = new AbortController();
    this.heartbeatAbort = controller;

    let timeout:
      ReturnType<typeof setTimeout> | undefined;

    try {
      const request = async (): Promise<boolean> => {
        const { data, error } = await this.backend.rpc(
          "ares_voice_heartbeat_v1",
          {
            p_generation_id: generationId,
          },
        ).abortSignal(controller.signal);

        return !error && data === true;
      };

      const deadline = new Promise<boolean>(
        (resolve) => {
          timeout = setTimeout(() => {
            controller.abort();
            resolve(false);
          }, VOICE_HEARTBEAT_TIMEOUT_MS);
        },
      );

      const authorized = await Promise.race([
        request(),
        deadline,
      ]);

      return (
        authorized &&
        !controller.signal.aborted &&
        this.isCurrentRoom(room, lifecycle)
      );

    } catch {
      return false;

    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }

      if (this.heartbeatAbort === controller) {
        this.heartbeatAbort = null;
      }
    }
  }

  private scheduleHeartbeat(
    room: Room,
    lifecycle: number,
    generationId: string,
  ): void {
    if (!this.isCurrentRoom(room, lifecycle)) {
      return;
    }

    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
    }

    this.heartbeatTimer = setTimeout(() => {
      this.heartbeatTimer = null;

      void this.runHeartbeat(
        room,
        lifecycle,
        generationId,
      );
    }, VOICE_HEARTBEAT_INTERVAL_MS);
  }

  private async runHeartbeat(
    room: Room,
    lifecycle: number,
    generationId: string,
  ): Promise<void> {
    if (!this.isCurrentRoom(room, lifecycle)) {
      return;
    }

    const authorized = await this.verifyHeartbeat(
      room,
      lifecycle,
      generationId,
    );

    if (!this.isCurrentRoom(room, lifecycle)) {
      return;
    }

    if (!authorized) {
      this.lastError = "VOICE_AUTHORIZATION_LOST";

      await this.leave().catch(() => undefined);

      return;
    }

    this.scheduleHeartbeat(
      room,
      lifecycle,
      generationId,
    );
  }

  private voiceAuthorized = false;

  private mutedBuilders = new Set<string>();

  private audioOwners = new Map<RemoteTrack, string>();

  private audioElements = new Map<
    RemoteTrack,
    HTMLMediaElement
  >();

  refreshProximityAudio(): void {
    const listener = this.room
      ? getVoiceBuilderId(this.room.localParticipant.identity)
      : null;

    for (const [track, element] of this.audioElements) {
      const owner = this.audioOwners.get(track);

      const gain =
        listener &&
        owner &&
        this.voiceAuthorized &&
        !this.mutedBuilders.has(owner)
          ? getAresVoiceGain(listener, owner)
          : 0;

      element.muted = gain <= 0;

      if ("setVolume" in track &&
          typeof track.setVolume === "function") {
        track.setVolume(gain);
      } else {
        element.volume = gain;
      }
    }
  }

  async join(accessToken: string): Promise<void> {
    if (this.room || this.connecting) {
      throw new Error("VOICE_ALREADY_CONNECTED");
    }

    if (!accessToken) {
      throw new Error("VOICE_AUTH_REQUIRED");
    }

    this.stopHeartbeat();
    this.voiceAuthorized = false;
    this.lastError = null;

    this.connecting = true;
    const generation = ++this.generation;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    this.pendingRoom = room;

    try {
      const { data, error } =
        await this.backend.functions.invoke<VoiceCredentials>(
          "ares-colony-voice-token",
          {
            method: "POST",
            body: {},
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

      if (generation !== this.generation) {
        return;
      }

      if (
        error ||
        !data ||
        typeof data.url !== "string" ||
        !data.url.startsWith("wss://") ||
        typeof data.token !== "string" ||
        !data.token ||
        typeof data.generationId !== "string" ||
        !VOICE_UUID_PATTERN.test(data.generationId)
      ) {
        throw new Error("VOICE_AUTHORIZATION_FAILED");
      }

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _publication,
          participant: RemoteParticipant,
        ) => {
          if (
            generation !== this.generation ||
            track.kind !== Track.Kind.Audio
          ) {
            return;
          }

          const builderId =
            getVoiceBuilderId(participant.identity);

          if (!builderId) {
            return;
          }

          // Repeated subscription events must not create
          // duplicate playback elements for the same track.
          if (this.audioElements.has(track)) {
            return;
          }

          const element = track.attach();

          element.autoplay = true;
          // Unknown or distant players start silent.
          element.muted = true;

          this.audioOwners.set(track, builderId);

          element.style.display = "none";

          document.body.appendChild(element);
          this.audioElements.set(track, element);
          this.refreshProximityAudio();
        },
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack) => {
          if (generation !== this.generation) {
            return;
          }

          this.removeAudio(track);
        },
      );

      room.on(RoomEvent.Disconnected, () => {
        const current =
          this.isCurrentRoom(room, generation);

        const pending =
          this.pendingRoom === room &&
          this.generation === generation;

        if (current || pending) {
          this.generation++;
          this.stopHeartbeat();

          this.voiceAuthorized = false;
          this.room = null;
          this.pendingRoom = null;
          this.connecting = false;

          this.cleanupAudio();
          this.mutedBuilders.clear();

          this.lastError ??= "VOICE_DISCONNECTED";
        }
      });

      await room.connect(data.url, data.token);

      if (generation !== this.generation) {
        return;
      }

      const identity = room.localParticipant.identity;
      const parts = identity.split(":");

      if (
        !getVoiceBuilderId(identity) ||
        parts[1].toLowerCase() !==
          data.generationId.toLowerCase()
      ) {
        throw new Error("VOICE_IDENTITY_MISMATCH");
      }

      this.room = room;
      this.pendingRoom = null;

      const authorized = await this.verifyHeartbeat(
        room,
        generation,
        data.generationId,
      );

      if (!this.isCurrentRoom(room, generation)) {
        return;
      }

      if (!authorized) {
        this.lastError = "VOICE_AUTHORIZATION_LOST";
        throw new Error("VOICE_AUTHORIZATION_LOST");
      }

      this.scheduleHeartbeat(
        room,
        generation,
        data.generationId,
      );

      this.voiceAuthorized = true;

      this.refreshProximityAudio();

      // No microphone permission requested on join.
      // Publishing requires an explicit user action.
    } catch (error) {
      if (generation === this.generation) {
        await this.leave().catch(() => undefined);
      }

      throw error;
    } finally {
      if (this.pendingRoom === room) {
        this.pendingRoom = null;
      }
      if (generation === this.generation) {
        this.connecting = false;
      }

      if (this.room !== room) {
        await room.disconnect();
      }
    }
  }

  async setMicrophoneEnabled(
    enabled: boolean,
  ): Promise<void> {
    const room = this.room;
    const lifecycle = this.generation;

    if (!room || !this.voiceAuthorized) {
      throw new Error("VOICE_NOT_AUTHORIZED");
    }

    await room.localParticipant
      .setMicrophoneEnabled(enabled);

    if (
      lifecycle !== this.generation ||
      this.room !== room ||
      !this.voiceAuthorized
    ) {
      await room.localParticipant
        .setMicrophoneEnabled(false)
        .catch(() => undefined);

      await room.disconnect().catch(() => undefined);

      throw new Error("VOICE_CONNECTION_CANCELLED");
    }
  }

  async unlockAudio(): Promise<void> {
    if (!this.room) {
      throw new Error("VOICE_NOT_CONNECTED");
    }

    await this.room.startAudio();
  }

  setBuilderMuted(
    builderId: string,
    muted: boolean,
  ): void {
    if (!VOICE_UUID_PATTERN.test(builderId)) {
      return;
    }

    builderId = builderId.toLowerCase();

    if (muted) {
      this.mutedBuilders.add(builderId);
    } else {
      this.mutedBuilders.delete(builderId);
    }

    this.refreshProximityAudio();
  }

  getSpeakingBuilderIds(): string[] {
    if (!this.room || !this.voiceAuthorized) {
      return [];
    }

    const speakers = new Set<string>();

    for (const participant of this.room.activeSpeakers) {
      const id = getVoiceBuilderId(participant.identity);

      if (id && !this.mutedBuilders.has(id)) {
        speakers.add(id);
      }
    }

    return [...speakers];
  }

  get audioPlaybackBlocked(): boolean {
    return Boolean(
      this.voiceAuthorized &&
      this.room &&
      !this.room.canPlaybackAudio
    );
  }

  getConnectedBuilderIds(): string[] {
    if (!this.room) {
      return [];
    }

    const builders = new Set<string>();

    for (
      const identity of
      this.room.remoteParticipants.keys()
    ) {
      const builderId = getVoiceBuilderId(identity);

      if (builderId) {
        builders.add(builderId);
      }
    }

    return [...builders];
  }

  get isConnected(): boolean {
    return this.room !== null &&
      this.voiceAuthorized;
  }

  get microphoneEnabled(): boolean {
    return this.room?.localParticipant
      .isMicrophoneEnabled ?? false;
  }

  private removeAudio(track: RemoteTrack): void {
    track.detach();

    const element = this.audioElements.get(track);
    element?.remove();
    this.audioElements.delete(track);
    this.audioOwners.delete(track);
  }

  private cleanupAudio(): void {
    for (const track of [...this.audioElements.keys()]) {
      this.removeAudio(track);
    }
  }

  async leave(): Promise<void> {
    this.voiceAuthorized = false;
    this.generation++;
    this.connecting = false;

    this.stopHeartbeat();

    const room = this.room;
    const pending = this.pendingRoom;

    this.room = null;
    this.pendingRoom = null;

    this.cleanupAudio();
    this.mutedBuilders.clear();

    const rooms = new Set<Room>();

    if (pending) rooms.add(pending);
    if (room) rooms.add(room);

    await Promise.allSettled(
      [...rooms].map(
        async (currentRoom) => {
          await currentRoom.disconnect();
        },
      ),
    );
  }
}
