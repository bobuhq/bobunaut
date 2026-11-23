import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

type SignProps = {
  position: [number, number, number];
  width: number;
  height: number;
  text: string;
  tint: string;
  phase: number;
};

export function CampusIlluminatedSign({ position, width, height, text, tint, phase }: SignProps) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.height = 96;
    canvas.width = Math.ceil(canvas.height * width / height);
    const ctx = canvas.getContext('2d')!;
    ctx.font = '700 68px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 9;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 36);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [width, height, text]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (!material.current) return;
    // Slow, staggered pulses with a constant readable baseline.
    const wave = .5 + .5 * Math.cos(clock.elapsedTime * (2 * Math.PI / 7) + phase);
    material.current.emissiveIntensity = 1.08 + .42 * wave ** 3;
  });

  return <mesh position={position}>
    <planeGeometry args={[width, height]} />
    <meshStandardMaterial
      ref={material}
      color="#10141c"
      map={texture}
      emissiveMap={texture}
      emissive={tint}
      emissiveIntensity={1.2}
      transparent
      depthWrite={false}
      toneMapped={false}
    />
  </mesh>;
}
