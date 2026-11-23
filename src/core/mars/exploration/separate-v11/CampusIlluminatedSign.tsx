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
  mobile: boolean;
};

export function CampusIlluminatedSign({ position, width, height, text, tint, phase, mobile }: SignProps) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.height = mobile ? 48 : 96;
    canvas.width = Math.ceil(canvas.height * width / height);
    const ctx = canvas.getContext('2d')!;
    ctx.font = `700 ${mobile ? 34 : 68}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = mobile ? 4 : 9;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - (mobile ? 18 : 36));
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [width, height, text, mobile]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (mobile || !material.current) return;
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
