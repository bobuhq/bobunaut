import type {
  RealtimeChannel,
} from "@supabase/supabase-js";

import * as THREE from "three";

import {
  supabase,
} from "../../../../lib/supabase";

export interface AresParkedShipState {
  position: [number, number, number];
  yaw: number;
}

function normalizeParkedShip(
  value: unknown,
): AresParkedShipState | null {
  if (!value || typeof value !== "object") return null;

  const ship = value as Partial<AresParkedShipState>;

  if (
    !Array.isArray(ship.position) ||
    ship.position.length !== 3 ||
    !ship.position.every(
      n => typeof n === "number" && Number.isFinite(n)
        && Math.abs(n) <= 10000
    ) ||
    typeof ship.yaw !== "number" ||
    !Number.isFinite(ship.yaw)
  ) return null;

  return {
    position: [
      ship.position[0],
      ship.position[1],
      ship.position[2],
    ],
    yaw: ship.yaw,
  };
}

export interface AresAttackState {
  id: string;
  kind: "punch" | "spin";
}

function normalizeAttack(value: unknown): AresAttackState | null {
  if (!value || typeof value !== "object") return null;
  const attack = value as Partial<AresAttackState>;
  if (
    typeof attack.id !== "string" ||
    !attack.id.length ||
    attack.id.length > 100 ||
    (attack.kind !== "punch" && attack.kind !== "spin")
  ) return null;
  return { id: attack.id, kind: attack.kind };
}

export interface AresPresenceTransform {
  attack?: AresAttackState | null;
  parkedShip?: AresParkedShipState | null;
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export interface AresRemoteBuilder {
  builderId: string;
  displayName: string;
  transform: AresPresenceTransform;
  updatedAt: number;
}

interface AresPlayerStatePayload {
  attack?: AresAttackState | null;
  parkedShip?: AresParkedShipState | null;
  builderId: string;
  displayName: string;
  sector: "ares";
  x: number;
  y: number;
  z: number;
  rotationY: number;
  updatedAt: number;
}

type RemoteBuildersListener = (
  builders: AresRemoteBuilder[],
) => void;

const ARES_CHANNEL_NAME =
  "mars:explore:ares:v1";

const PLAYER_STATE_EVENT =
  "player_state";

const PRESENCE_SEND_INTERVAL_MS =
  125;

const POSITION_EPSILON =
  0.025;

const ROTATION_EPSILON =
  0.015;

function normalizeDisplayName(
  displayName: string | null | undefined,
  builderId: string,
): string {
  const normalized =
    displayName?.trim();

  if (normalized) {
    return normalized.slice(0, 40);
  }

  return `Builder ${builderId.slice(0, 6)}`;
}

function isPlayerStatePayload(
  value: unknown,
): value is AresPlayerStatePayload {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const payload =
    value as Partial<AresPlayerStatePayload>;

  return (
    typeof payload.builderId === "string" &&
    typeof payload.displayName === "string" &&
    payload.sector === "ares" &&
    typeof payload.x === "number" &&
    Number.isFinite(payload.x) &&
    typeof payload.y === "number" &&
    Number.isFinite(payload.y) &&
    typeof payload.z === "number" &&
    Number.isFinite(payload.z) &&
    typeof payload.rotationY === "number" &&
    Number.isFinite(payload.rotationY) &&
    typeof payload.updatedAt === "number" &&
    Number.isFinite(payload.updatedAt)
  );
}

function rotationDifference(
  a: number,
  b: number,
): number {
  return Math.abs(
    THREE.MathUtils.euclideanModulo(
      a - b + Math.PI,
      Math.PI * 2,
    ) - Math.PI,
  );
}

export class AresPresenceEngine {
  private channel:
    | RealtimeChannel
    | null = null;

  private builderId = "";

  private displayName = "";

  private connected = false;

  private lifecycle = 0;

  private pendingConnectCancel:
    (() => void) | null = null;

  private removal:
    Promise<void> | null = null;

  private sendInFlight:
    object | null = null;

  private remotePacketTimes =
    new Map<string, number>();

  private lastSentAt = 0;

  private lastTransform:
    | AresPresenceTransform
    | null = null;

  private remoteBuilders =
    new Map<
      string,
      AresRemoteBuilder
    >();

  private listeners =
    new Set<RemoteBuildersListener>();

  async connect(
    builderId: string,
    displayName?: string | null,
  ): Promise<void> {
    const normalizedBuilderId =
      builderId.trim();

    if (!normalizedBuilderId) {
      throw new Error(
        "Builder ID is required for Ares multiplayer.",
      );
    }

    const cleanup = this.channel
      ? this.disconnect()
      : this.removal;

    const lifecycle = ++this.lifecycle;

    if (cleanup) {
      await cleanup;
    }

    if (lifecycle !== this.lifecycle) {
      throw new Error(
        "Ares realtime connection cancelled."
      );
    }

    this.builderId =
      normalizedBuilderId;

    this.displayName =
      normalizeDisplayName(
        displayName,
        normalizedBuilderId,
      );

    const channel =
      supabase.channel(
        ARES_CHANNEL_NAME,
        {
          config: {
            broadcast: {
              self: false,
              ack: true,
            },
          },
        },
      );

    this.channel = channel;

    channel.on(
      "broadcast",
      {
        event:
          PLAYER_STATE_EVENT,
      },
      (message) => {
        if (
          this.channel !== channel ||
          this.lifecycle !== lifecycle ||
          !this.connected
        ) {
          return;
        }

        const payload =
          message.payload;

        if (
          !isPlayerStatePayload(
            payload,
          ) ||
          payload.builderId ===
            this.builderId
        ) {
          return;
        }

        const previousPacketTime =
          this.remotePacketTimes.get(payload.builderId);

        if (
          previousPacketTime !== undefined &&
          payload.updatedAt <= previousPacketTime
        ) {
          return;
        }

        this.remotePacketTimes.set(
          payload.builderId,
          payload.updatedAt,
        );

        this.remoteBuilders.set(
          payload.builderId,
          {
            builderId:
              payload.builderId,
            displayName:
              payload.displayName,
            transform: {
              attack: normalizeAttack(payload.attack),
              parkedShip: normalizeParkedShip(payload.parkedShip),
              x: payload.x,
              y: payload.y,
              z: payload.z,
              rotationY:
                payload.rotationY,
            },
            updatedAt:
              Date.now(),
          },
        );

        this.publishRemoteBuilders();
      },
    );

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const isCurrent = () =>
          this.channel === channel &&
          this.lifecycle === lifecycle;

        const finish = (error?: Error) => {
          if (settled) return;

          settled = true;
          window.clearTimeout(timeout);

          if (this.pendingConnectCancel === cancel) {
            this.pendingConnectCancel = null;
          }

          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };

        const cancel = () => finish(
          new Error("Ares realtime connection cancelled.")
        );

        const timeout = window.setTimeout(() => {
          finish(
            new Error("Ares realtime connection timed out.")
          );
        }, 10000);

        this.pendingConnectCancel = cancel;

        channel.subscribe((status) => {
          if (!isCurrent()) return;

          console.info(
            "[ARES MULTIPLAYER] channel status:",
            status,
          );

          if (status === "SUBSCRIBED") {
            this.connected = true;
            finish();
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            this.connected = false;
            this.sendInFlight = null;
            this.lastTransform = null;
            this.lastSentAt = 0;

            this.remoteBuilders.clear();
            this.remotePacketTimes.clear();

            this.publishRemoteBuilders();

            if (!settled) {
              finish(new Error(
                `Ares realtime connection failed: ${status}`
              ));
              return;
            }

            // CLOSED is terminal. Transient errors retain
            // the existing SDK channel for automatic rejoin.
            if (status === "CLOSED") {
              void this.disconnect().catch(() => undefined);
            }
          }
        });
      });
    } catch (error) {
      if (
        this.channel === channel &&
        this.lifecycle === lifecycle
      ) {
        await this.disconnect();
      }

      throw error;
    }
  }

  subscribe(
    listener: RemoteBuildersListener,
  ): () => void {
    this.listeners.add(
      listener,
    );

    listener(
      this.getRemoteBuilders(),
    );

    return () => {
      this.listeners.delete(
        listener,
      );
    };
  }

  async updateTransform(
    transform: AresPresenceTransform,
    force = false,
  ): Promise<void> {
    if (
      !this.channel ||
      !this.connected ||
      !this.builderId
    ) {
      return;
    }

    const channel = this.channel;
    const lifecycle = this.lifecycle;

    if (this.sendInFlight) {
      return;
    }

    const now =
      Date.now();

    if (
      !force &&
      now >= this.lastSentAt &&
      now - this.lastSentAt <
        PRESENCE_SEND_INTERVAL_MS
    ) {
      return;
    }

    if (
      !force &&
      this.lastTransform
    ) {
      const positionChanged =
        Math.abs(
          transform.x -
            this.lastTransform.x,
        ) > POSITION_EPSILON ||
        Math.abs(
          transform.y -
            this.lastTransform.y,
        ) > POSITION_EPSILON ||
        Math.abs(
          transform.z -
            this.lastTransform.z,
        ) > POSITION_EPSILON;

      const rotationChanged =
        rotationDifference(
          transform.rotationY,
          this.lastTransform.rotationY,
        ) >
        ROTATION_EPSILON;

      const attackChanged =
        transform.attack?.id !== this.lastTransform.attack?.id;

      const shipChanged =
        JSON.stringify(transform.parkedShip ?? null) !==
        JSON.stringify(this.lastTransform.parkedShip ?? null);

      if (
        !positionChanged &&
        !rotationChanged &&
        !shipChanged &&
        !attackChanged
      ) {
        return;
      }
    }

    const payload:
      AresPlayerStatePayload = {
        builderId:
          this.builderId,
        displayName:
          this.displayName,
        sector: "ares",
        attack: normalizeAttack(transform.attack),
        parkedShip: normalizeParkedShip(transform.parkedShip),
        x: transform.x,
        y: transform.y,
        z: transform.z,
        rotationY:
          transform.rotationY,
        updatedAt: now,
      };

    const sendToken = {};
    this.sendInFlight = sendToken;

    // Throttle attempts even when acknowledgement fails.
    this.lastSentAt = now;

    try {
      const response = await channel.send({
        type: "broadcast",
        event: PLAYER_STATE_EVENT,
        payload,
      });

      if (
        this.channel !== channel ||
        this.lifecycle !== lifecycle ||
        !this.connected ||
        this.sendInFlight !== sendToken
      ) {
        return;
      }

      if (response !== "ok") {
        console.warn(
          "[ARES MULTIPLAYER] broadcast response:",
          response,
        );
        return;
      }

      this.lastTransform = {
        x: payload.x,
        y: payload.y,
        z: payload.z,
        rotationY: payload.rotationY,
        attack: payload.attack,
        parkedShip: payload.parkedShip,
      };
    } catch {
      // Failed sends remain eligible for a later retry.
      // Never expose transport details or authentication data.
    } finally {
      if (this.sendInFlight === sendToken) {
        this.sendInFlight = null;
      }
    }
  }

  getRemoteBuilders():
    AresRemoteBuilder[] {
    return Array.from(
      this.remoteBuilders.values(),
    );
  }

  pruneStaleBuilders(
    staleAfterMs: number,
  ): void {
    const now =
      Date.now();

    let changed = false;

    for (
      const [
        builderId,
        builder,
      ] of this.remoteBuilders
    ) {
      if (
        now -
          builder.updatedAt >=
        staleAfterMs
      ) {
        this.remoteBuilders.delete(
          builderId,
        );

        this.remotePacketTimes.delete(builderId);

        changed = true;
      }
    }

    if (changed) {
      this.publishRemoteBuilders();
    }
  }

  private publishRemoteBuilders():
    void {
    const builders =
      this.getRemoteBuilders();

    for (
      const listener of
      this.listeners
    ) {
      listener(builders);
    }
  }

  async disconnect(): Promise<void> {
    const channel = this.channel;

    this.lifecycle++;
    this.channel = null;
    this.connected = false;

    const cancel = this.pendingConnectCancel;
    this.pendingConnectCancel = null;

    cancel?.();

    this.sendInFlight = null;
    this.lastTransform = null;
    this.lastSentAt = 0;

    this.remoteBuilders.clear();
    this.remotePacketTimes.clear();

    this.publishRemoteBuilders();

    if (channel) {
      const removal = (async () => {
        const result = await supabase.removeChannel(channel);

        if (result !== "ok") {
          throw new Error(
            "Ares realtime channel cleanup failed."
          );
        }
      })();

      this.removal = removal;

      try {
        await removal;
      } finally {
        if (this.removal === removal) {
          this.removal = null;
        }
      }
    } else if (this.removal) {
      await this.removal;
    }
  }
}
