import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { animateRelay, RELAY_BORESIGHT, RELAY_EMITTER } from './relay-motion.mjs';

/** Attach to the cloned GLB joints only; never mutate the loader's cached scene. */
export function DeepSpaceRelay({ scene, color, phase = 0 }: { scene: THREE.Group; color?: string; phase?: number }) {
 const elapsed = useRef(0);
 const relay = useMemo(() => {
  const azimuth = scene.getObjectByName('dish-azimuth');
  const elevation = scene.getObjectByName('dish-elevation');
  if (!azimuth || !elevation || elevation.parent !== azimuth) throw new Error('Relay GLB joint hierarchy changed');
  // Open tapered volume: local +Y is aligned with the measured feed boresight.
  const geometry = new THREE.CylinderGeometry(color ? .85 : .42, .08, color ? 65 : 36, 16, 1, true);
  geometry.translate(0, color ? 32.5 : 18, 0);
  const material = new THREE.ShaderMaterial({
   transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
   side: THREE.DoubleSide, toneMapped: false,
   uniforms: { pulse: { value: 1 }, halo: { value: 0 }, tint: { value: new THREE.Color(color ?? "#289fff") } },
   vertexShader: `varying vec2 beamUv; void main(){beamUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader: `uniform float pulse; uniform float halo; uniform vec3 tint; varying vec2 beamUv;
    void main(){float h=beamUv.y;float fade=pow(1.0-h,1.65)*smoothstep(0.0,0.008,h);
     float soft=pow(max(0.0,sin(beamUv.x*3.14159265)),1.5);
     vec3 color=mix(tint,mix(tint,vec3(1.0),0.5),1.0-h);
     gl_FragColor=vec4(color,fade*pulse*mix(0.85,0.16,halo)*soft);}`,
  });
  const haloMaterial = material.clone(); haloMaterial.uniforms.halo.value = 1;
  const beam = new THREE.Group(); beam.name = 'relay-xenon-beam';
  beam.position.set(...RELAY_EMITTER);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...RELAY_BORESIGHT));
  const core = new THREE.Mesh(geometry,material), halo = new THREE.Mesh(geometry,haloMaterial);
  halo.scale.set(5,1,5); beam.add(core,halo);
  return { azimuth, elevation, beam, geometry, material, haloMaterial };
 },[scene,color]);
 useEffect(() => {
  relay.elevation.add(relay.beam);
  return () => {
   relay.beam.removeFromParent();
   relay.azimuth.rotation.y = 0; relay.elevation.rotation.x = 0;
   relay.geometry.dispose(); relay.material.dispose(); relay.haloMaterial.dispose();
  };
 },[relay]);
 useFrame((_state,delta) => {
  elapsed.current += delta;
  if (color) {
   // Full azimuth turn over two minutes; narrow 7-degree sky cone keeps
   // the three separate search volumes from crossing the walking routes.
   relay.azimuth.rotation.y = phase + elapsed.current * Math.PI / 60;
   relay.elevation.rotation.x = -48 * Math.PI / 180 + Math.sin(elapsed.current * .11 + phase) * .025;
  } else animateRelay(relay.azimuth,relay.elevation,elapsed.current);
  const pulse = .94 + .06*Math.sin(elapsed.current*2*Math.PI/4.5);
  relay.material.uniforms.pulse.value = pulse;
  relay.haloMaterial.uniforms.pulse.value = pulse;
 });
 return null;
}
