import {
  Bloom,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";

export default function MarsCinematicPostProcessing() {
  return (
    <EffectComposer
      multisampling={0}
    >
      <Bloom
        intensity={0.9}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.35}
        mipmapBlur
      />

      <Vignette
        eskil={false}
        offset={0.18}
        darkness={0.58}
      />
    </EffectComposer>
  );
}
