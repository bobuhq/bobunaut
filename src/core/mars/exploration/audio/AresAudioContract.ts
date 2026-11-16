import type { AresConsoleKind } from "./AresOfficialAudio";
/** Shared production/offline surface boundary. No arrival orchestration in the offline host. */
export interface AresAudioContract {
  getEnabled(): boolean;
  subscribe(listener: () => void): () => void;
  setEnabled(enabled: boolean): void;
  routeChanged(pathname: string): void;
  attachSurface(): () => void;
  getRunningContext(): AudioContext | null;
  setGenesisControl(inside: boolean): void;
  setMusicInterior(id: string, inside: boolean): void;
  door(id: string, open: boolean, position: readonly [number, number, number]): void;
  stopDoor(id: string): void;
  setListener(x: number, y: number, z: number, fx: number, fy: number, fz: number): void;
  setInterior(inside: boolean): void;
  setCrystalDistance(distance: number): void;
  terminal(kind: AresConsoleKind): void;
}
