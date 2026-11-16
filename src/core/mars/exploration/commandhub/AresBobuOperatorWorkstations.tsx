import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * BOBU workstation displays. CanvasTexture keeps terminal text sharp and
 * avoids dozens of text geometry meshes. All values are schematic; nothing
 * here represents live backend data. No RPCs, auth, GP, or mission writes.
 */
type ConsoleKind = "network" | "mission" | "research" | "colony";

type ConsoleSpec = {
  label: string;
  subtitle: string;
  accent: string;
  lines: string[];
  modules: string[];
};

const CONSOLES: Record<ConsoleKind, ConsoleSpec> = {
  network: {
    label: "BOBU NETWORK",
    subtitle: "GENESIS // IDENTITY & MINING",
    accent: "#75f4ff",
    lines: [
      "> net.open  bobu://ares/network",
      "> module    GENESIS_IDENTITY",
      "> channels  TELEGRAM | X | IG",
      "> mining    SESSION_ENGINE",
      "> wallet    GP_LEDGER (SERVER)",
      "> policy    READ_ONLY_PREVIEW",
    ],
    modules: ["GENESIS", "MINING", "GP LEDGER"],
  },
  mission: {
    label: "ARES MISSION CONTROL",
    subtitle: "EXPLORATION // DISCOVERY SYSTEM",
    accent: "#c49aff",
    lines: [
      "> mars.mount /ares/exploration",
      "> mission    TERMINAL_ROUTER",
      "> archive    DISCOVERY_RECORDS",
      "> research   SCIENCE_NODE",
      "> rewards    VERIFIED_RPC_ONLY",
      "> policy    READ_ONLY_PREVIEW",
    ],
    modules: ["MISSION", "RESEARCH", "ARCHIVE"],
  },
  research: {
    label: "BOBU RESEARCH NODE",
    subtitle: "LAB // SCIENCE TERMINAL",
    accent: "#82ffb8",
    lines: [
      "> init     mars_research_node",
      "> archive  ARES_DISCOVERIES",
      "> scans    GEOSCIENCE / DATA",
      "> analysis FIELD_SAMPLES",
      "> access   INTERACTIVE_TERMINAL",
      "> policy   READ_ONLY_PREVIEW",
    ],
    modules: ["SCIENCE", "ANALYSIS", "RECORDS"],
  },
  colony: {
    label: "BOBU COLONY SYSTEM",
    subtitle: "BASE CONTROL // PURPLE CRYSTAL ENERGY",
    accent: "#ffce80",
    lines: [
      "> colony.open bobu_genesis",
      "> modules MATERIAL | WATER | FOOD",
      "> modules SCIENCE | CRYSTAL_PWR",
      "> build   MARS_MARKET / PLACEMENT",
      "> state   SERVER_AUTHORITATIVE",
      "> policy  READ_ONLY_PREVIEW",
    ],
    modules: ["RESOURCES", "ENERGY", "BUILD"],
  },
};

function buildConsoleTexture(kind: ConsoleKind): THREE.CanvasTexture {
  const { label, subtitle, accent, lines, modules } = CONSOLES[kind];
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas 2D context");
  const c = context;

  const gradient = c.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, "#06121a");
  gradient.addColorStop(1, "#0a0c16");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  c.lineWidth = 1;
  c.strokeStyle = "rgba(94,178,197,0.11)";
  for (let x = 0; x <= 1024; x += 28) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 512); c.stroke();
  }
  for (let y = 0; y <= 512; y += 28) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke();
  }

  c.fillStyle = accent;
  c.fillRect(24, 25, 7, 52);
  c.font = "bold 37px monospace";
  c.fillText(label, 47, 58);
  c.font = "19px monospace";
  c.fillStyle = "#a5c9d7";
  c.fillText(subtitle, 47, 87);

  c.strokeStyle = "#315665";
  c.strokeRect(22, 107, 980, 365);
  c.beginPath(); c.moveTo(680, 107); c.lineTo(680, 472); c.stroke();
  c.fillStyle = accent;
  c.font = "bold 19px monospace";
  c.fillText("CONSOLE LOG / VISUAL PREVIEW", 42, 144);
  c.font = "20px monospace";
  lines.forEach((line, i) => {
    c.fillStyle = i === 0 ? "#e1fbff" : i === 5 ? "#ffd184" : "#99d6da";
    c.fillText(line, 41, 186 + i * 39);
  });

  c.fillStyle = accent;
  c.font = "bold 20px monospace";
  c.fillText("SYSTEM MODULES", 700, 145);
  modules.forEach((m, i) => {
    const y = 182 + i * 90;
    c.fillStyle = "#182f3b";
    c.fillRect(700, y, 280, 66);
    c.fillStyle = accent;
    c.fillRect(700, y, 4, 66);
    c.font = "bold 20px monospace";
    c.fillText(m, 716, y + 27);
    c.font = "15px monospace";
    c.fillStyle = "#91aebb";
    c.fillText("INTERFACE / PREVIEW", 716, y + 50);
  });
  c.fillStyle = "#7996a3";
  c.fillRect(22, 484, 980, 2);
  c.font = "16px monospace";
  c.fillStyle = "#99b7bf";
  c.fillText("BOBU UNIVERSE  /  ARES CONTROL ROOM   -   NOT LIVE TELEMETRY", 28, 506);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function ConsoleScreen({ kind }: { kind: ConsoleKind }) {
  const texture = useMemo(() => buildConsoleTexture(kind), [kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      {/* Overlay the original four colored blocks, do not alter the console body. */}
      <mesh position={[0, 1.185, 0.125]} rotation={[-0.38, 0, 0]}>
        <boxGeometry args={[1.95, 0.62, 0.06]} />
        <meshStandardMaterial color="#121a23" metalness={0.75} roughness={0.27} />
      </mesh>
      <mesh position={[0, 1.185, 0.16]} rotation={[-0.38, 0, 0]}>
        <planeGeometry args={[1.83, 0.54]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.95, 0.43]}>
        <boxGeometry args={[1.95, 0.035, 0.045]} />
        <meshBasicMaterial color={CONSOLES[kind].accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function AresBobuOperatorWorkstations() {
  return (
    <group>
      <group position={[-5.78, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
        <ConsoleScreen kind="network" />
      </group>
      <group position={[5.78, 0, -4.6]} rotation={[0, -Math.PI / 2, 0]}>
        <ConsoleScreen kind="mission" />
      </group>
      <group position={[-5.78, 0, 4.35]} rotation={[0, Math.PI / 2, 0]}>
        <ConsoleScreen kind="research" />
      </group>
      <group position={[5.78, 0, 4.35]} rotation={[0, -Math.PI / 2, 0]}>
        <ConsoleScreen kind="colony" />
      </group>
    </group>
  );
}
