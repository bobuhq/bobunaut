import type {
  RealtimeChannel,
} from "@supabase/supabase-js";

import * as THREE from "three";

import {
  supabase,
} from "../../../../lib/supabase";

export interface AresPresenceTransform {
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

    if (this.channel) {
      await this.disconnect();
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

        this.remoteBuilders.set(
          payload.builderId,
          {
            builderId:
              payload.builderId,
            displayName:
              payload.displayName,
            transform: {
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

    await new Promise<void>(
      (resolve, reject) => {
        const timeout =
          window.setTimeout(
            () => {
              reject(
                new Error(
                  "Ares realtime connection timed out.",
                ),
              );
            },
            10000,
          );

        channel.subscribe(
          (status) => {
            console.info(
              "[ARES MULTIPLAYER] channel status:",
              status,
            );

            if (
              status ===
              "SUBSCRIBED"
            ) {
              window.clearTimeout(
                timeout,
              );

              this.connected =
                true;

              resolve();
              return;
            }

            if (
              status ===
                "CHANNEL_ERROR" ||
              status ===
                "TIMED_OUT"
            ) {
              window.clearTimeout(
                timeout,
              );

              reject(
                new Error(
                  `Ares realtime connection failed: ${status}`,
                ),
              );
            }
          },
        );
      },
    );
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

    const now =
      Date.now();

    if (
      !force &&
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

      if (
        !positionChanged &&
        !rotationChanged
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
        x: transform.x,
        y: transform.y,
        z: transform.z,
        rotationY:
          transform.rotationY,
        updatedAt: now,
      };

    const response =
      await this.channel.send({
        type: "broadcast",
        event:
          PLAYER_STATE_EVENT,
        payload,
      });

    if (
      response !== "ok"
    ) {
      console.warn(
        "[ARES MULTIPLAYER] broadcast response:",
        response,
      );
    }

    this.lastSentAt = now;

    this.lastTransform = {
      ...transform,
    };
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

  async disconnect():
    Promise<void> {
    const channel =
      this.channel;

    this.channel = null;
    this.connected = false;
    this.lastTransform = null;
    this.lastSentAt = 0;

    this.remoteBuilders.clear();

    this.publishRemoteBuilders();

    if (channel) {
      await supabase.removeChannel(
        channel,
      );
    }
  }
}
