export default function MarsCinematicLighting() {
  return (
    <>
      {/*
       * BOBU Mars cinematic key light.
       *
       * Low-angle warm sunlight produces long Martian shadows.
       * 1024 shadow map is intentional for WebGL stability.
       */}
      <directionalLight
        castShadow
        position={[-50, 18, -35]}
        intensity={4.2}
        color="#ff8c42"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />

      {/*
       * Cool technological rim light.
       *
       * No shadow map: this is a visual separation light only.
       */}
      <directionalLight
        position={[20, 12, -20]}
        intensity={2.1}
        color="#6282ff"
      />

      <hemisphereLight
        intensity={0.8}
        color="#ff9d68"
        groundColor="#120503"
      />

      <ambientLight
        intensity={0.25}
        color="#6b3d32"
      />
    </>
  );
}
