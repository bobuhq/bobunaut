import { useEffect, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Kind = "mission" | "research";
const CONTENT: Record<Kind, string[]> = {
  mission: [
    "> bobu network / ares mission control",
    "> open mission_registry --read-only",
    "> scan ARES / ECHO / FRACTURE / RELAY",
    "> verify genesis_identity gateway",
    "> prepare discovery archive uplink",
    "> gp_ledger policy: server_authoritative",
    "> await operator command _",
  ],
  research: [
    "> bobu network / research terminal",
    "> inspect mars sample signatures",
    "> scan purple crystal resonance",
    "> fetch discovery_archive index",
    "> analyze echo_beneath_ares",
    "> mission_claim authorization required",
    "> await research input _",
  ],
};

export function AresLiveTerminalVisual({ kind }: { kind: Kind }) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTick = useRef(-1);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 320;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    canvasRef.current = canvas;
    setTexture(map);
    return () => {
      canvasRef.current = null;
      map.dispose();
    };
  }, []);

  useFrame(({ clock }) => {
    const tick = Math.floor(clock.elapsedTime * 5);
    if (tick === lastTick.current || !canvasRef.current || !texture) return;
    lastTick.current = tick;
    const c = canvasRef.current.getContext("2d");
    if (!c) return;
    const w = 1024;
    const h = 320;
    const accent = kind === "mission" ? "#d99aff" : "#7ff2ff";
    c.fillStyle = "#06121d";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = kind === "mission" ? "#2a193e" : "#123340";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    for (let y = 0; y < h; y += 26) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }
    c.fillStyle = "#101c2a";
    c.fillRect(12, 12, w - 24, 48);
    c.fillStyle = accent;
    c.font = "bold 27px monospace";
    c.fillText(kind === "mission" ? "BOBU // MISSION CONTROL" : "BOBU // RESEARCH NODE", 28, 45);
    c.font = "19px monospace";
    c.fillStyle = "#a0bfca";
    c.fillText("ARES-01    VISUAL TERMINAL    NO LIVE TELEMETRY", 30, 88);
    const lines = CONTENT[kind];
    const t = clock.elapsedTime;
    const rows = Math.min(lines.length, 1 + (Math.floor(t * 1.8) % (lines.length + 2)));
    c.font = "23px monospace";
    for (let i = 0; i < rows; i += 1) {
      c.fillStyle = i === rows - 1 ? accent : "#bfe5ee";
      c.fillText(lines[i], 28, 126 + i * 26);
    }
    if (Math.floor(t * 2) % 2 === 0) {
      c.fillStyle = accent;
      c.fillRect(28, 126 + rows * 26, 12, 14);
    }
    texture.needsUpdate = true;
  });

  if (!texture) return null;
  return (
    <mesh position={[0, 0, 0.027]} renderOrder={10}>
      <planeGeometry args={[1.95, 0.48]} />
      <meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

export function AresEBeacon({ active, label }: { active: boolean; label: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.visible = Math.sin(clock.elapsedTime * 7) > -0.25;
    }
  });
  if (!active) return null;
  return (
    <group ref={ref} position={[0, 2.04, 0.62]}>
      <mesh>
        <boxGeometry args={[1.85, 0.32, 0.06]} />
        <meshBasicMaterial color="#071c18" />
      </mesh>
      <mesh position={[-0.79, 0, 0.04]}>
        <boxGeometry args={[0.15, 0.15, 0.018]} />
        <meshBasicMaterial color="#79ff6b" toneMapped={false} />
      </mesh>
      <Text position={[0.14, 0, 0.045]} fontSize={0.12}
        anchorX="center" anchorY="middle" color="#bdffcd">
        {`[ E ] ${label}`}
      </Text>
    </group>
  );
}
