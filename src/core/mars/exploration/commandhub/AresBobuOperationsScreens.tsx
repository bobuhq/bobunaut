import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Standalone BOBU command-room screens. Visual demo data only.
 * No account, server, GP, mission, or production status is queried here.
 */
type ScreenKind = "network" | "mission" | "system";

function drawTerminal(kind: ScreenKind): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const palettes = {
    network: { glow: "#73f6ff", muted: "#428698", name: "BOBU NETWORK" },
    mission: { glow: "#b994ff", muted: "#72609a", name: "ARES MISSION CONTROL" },
    system: { glow: "#87ff79", muted: "#5c9b6c", name: "BOBU COMMAND SYSTEM" },
  };
  const p = palettes[kind];

  const bg = ctx.createLinearGradient(0, 0, 1024, 576);
  bg.addColorStop(0, "#07121d");
  bg.addColorStop(1, "#050a13");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 576);

  ctx.strokeStyle = "#173340";
  ctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 576); ctx.stroke();
  }
  for (let y = 0; y < 576; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  ctx.fillStyle = p.glow;
  ctx.fillRect(30, 28, 6, 48);
  ctx.font = "bold 32px monospace";
  ctx.fillText(p.name, 55, 63);
  ctx.fillStyle = "#a3b7c6";
  ctx.font = "17px monospace";
  ctx.fillText("ARES SECTOR  /  CONTROL INTERFACE  /  VISUAL PREVIEW", 53, 93);
  ctx.strokeStyle = p.muted;
  ctx.strokeRect(30, 114, 964, 420);
  ctx.beginPath(); ctx.moveTo(660, 115); ctx.lineTo(660, 533); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, 280); ctx.lineTo(660, 280); ctx.stroke();

  ctx.fillStyle = p.glow;
  ctx.font = "bold 20px monospace";
  ctx.fillText("SYSTEM CONSOLE", 52, 151);
  ctx.font = "18px monospace";
  const lines = kind === "mission" ? [
    "> bobu mission terminal --sector ares",
    "> mission_archive / discovery_records",
    "> reward ledger: AUTHORIZED SERVER ONLY",
    "> active uplink: LOCAL VISUAL PREVIEW",
  ] : kind === "network" ? [
    "> bobu network --connect ares",
    "> identity: genesis verification gateway",
    "> mining: session lifecycle monitor",
    "> gp ledger: READ FROM SERVER ONLY",
  ] : [
    "> boot bobu://command-hub",
    "> explorer mode: ARES OPERATIONS",
    "> reactor: PURPLE CRYSTAL ENERGY",
    "> access: RESEARCH / MISSION / MARKET",
  ];
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? "#e0fcff" : "#91c4cc";
    ctx.fillText(line, 54, 185 + i * 26);
  });

  ctx.fillStyle = p.glow;
  ctx.font = "bold 21px monospace";
  ctx.fillText("COMMAND ROUTES", 53, 324);
  ctx.font = "18px monospace";
  ["/network/identity", "/mars/ares/exploration", "/research/discovery", "/colony/resources", "/wallet/gp-ledger"].forEach((line, i) => {
    ctx.fillStyle = i % 2 ? "#aac0cb" : p.glow;
    ctx.fillText(`> ${line}`, 58, 359 + i * 31);
  });

  ctx.fillStyle = p.glow;
  ctx.font = "bold 20px monospace";
  ctx.fillText("BOBU SYSTEM", 681, 151);
  ctx.fillStyle = "#c5d9df";
  ctx.font = "17px monospace";
  ctx.fillText("DISPLAY MODE", 683, 193);
  ctx.fillText("DEMO TELEMETRY", 683, 216);
  ctx.fillText("NOT LIVE DATA", 683, 240);
  const bars: Array<[string, number, string]> = [
    ["LINK", 0.86, "#75f4ff"],
    ["ENERGY", 0.63, "#a987ff"],
    ["DATA", 0.94, "#87ff79"],
    ["QUEUE", 0.47, "#ffc574"],
  ];
  bars.forEach(([label, pct, color], i) => {
    const y = 291 + i * 57;
    ctx.fillStyle = "#c5d9df";
    ctx.fillText(label, 685, y);
    ctx.fillStyle = "#23313b";
    ctx.fillRect(790, y - 15, 165, 15);
    ctx.fillStyle = color;
    ctx.fillRect(790, y - 15, 165 * pct, 15);
  });
  ctx.fillStyle = p.muted;
  ctx.fillRect(30, 547, 964, 3);
  ctx.fillStyle = "#9ea9af";
  ctx.font = "14px monospace";
  ctx.fillText("BOBU UNIVERSE  //  OPERATIONS DISPLAY V3.2  //  SCHEMATIC DATA", 32, 568);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function OpsDisplay({
  position,
  rotation = 0,
  kind,
}: {
  position: [number, number, number];
  rotation?: number;
  kind: ScreenKind;
}) {
  const texture = useMemo(() => drawTerminal(kind), [kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow>
        <boxGeometry args={[3.25, 1.86, 0.09]} />
        <meshStandardMaterial color="#121a25" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[3.08, 1.73]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.98, 0.05]}>
        <boxGeometry args={[3.12, 0.035, 0.04]} />
        <meshBasicMaterial color={kind === "system" ? "#87ff79" : kind === "mission" ? "#b994ff" : "#73f6ff"} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function AresBobuOperationsScreens() {
  return (
    <group>
      {/* Back-wall command displays, mounted behind existing walkable space. */}
      <OpsDisplay position={[-3.15, 2.73, -7.94]} kind="network" />
      <OpsDisplay position={[3.15, 2.73, -7.94]} kind="mission" />
      {/* Two side-wall command displays; central terminals are untouched. */}
      <OpsDisplay position={[-7.24, 2.72, -2.5]} rotation={Math.PI / 2} kind="system" />
      <OpsDisplay position={[7.24, 2.72, -2.5]} rotation={-Math.PI / 2} kind="network" />
    </group>
  );
}
