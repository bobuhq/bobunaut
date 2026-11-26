import type { AresRemoteBuilder } from "./AresPresenceEngine";

type Position = {
  x: number;
  y: number;
  z: number;
};

let snapshot: {
  owner: string;
  position: Position;
  builders: readonly AresRemoteBuilder[];
  updatedAt: number;
} | null = null;

export function aresVoiceGain(distance: number): number {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  if (distance <= 20) return 1;
  if (distance <= 30) return 1 - (distance - 20) * 0.06;
  if (distance < 50) return 0.4 * (50 - distance) / 20;
  return 0;
}

export function publishAresVoicePositions(
  owner: string,
  position: Position,
  builders: readonly AresRemoteBuilder[],
): void {
  snapshot = {
    owner: owner.toLowerCase(),
    position: {
      x: position.x,
      y: position.y,
      z: position.z,
    },
    builders,
    updatedAt: Date.now(),
  };
}

export function clearAresVoicePositions(owner: string): void {
  if (snapshot?.owner === owner.toLowerCase()) {
    snapshot = null;
  }
}

export function getAresVoiceGain(
  listener: string,
  speaker: string,
): number {
  const now = Date.now();

  if (
    !snapshot ||
    snapshot.owner !== listener.toLowerCase() ||
    now - snapshot.updatedAt >= 1500
  ) return 0;

  const remote = snapshot.builders.find(
    builder => builder.builderId.toLowerCase() === speaker.toLowerCase(),
  );

  if (!remote || now - remote.updatedAt >= 4000) return 0;

  const local = snapshot.position;
  const target = remote.transform;

  return aresVoiceGain(Math.hypot(
    local.x - target.x,
    local.y - target.y,
    local.z - target.z,
  ));
}
