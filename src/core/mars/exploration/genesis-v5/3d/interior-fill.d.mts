import type { Material } from 'three';
export const ROOM_FILL: Readonly<{control: number; corridor: number; habitat: number}>;
export function createInteriorFill(): {
 register(material: Material, room: string): void;
 update(enabled: boolean, indoor: boolean, delta: number): void;
 dispose(): void;
};
