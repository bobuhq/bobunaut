/** Additive local visual treatment: the shared rooms, shell and doors stay intact.
 * The crown sits above the existing roof; it does not define walkable geometry.
 */
export function GenesisLocalCommandCrown() {
  return <group name="genesis-local-dark-glass-command-crown">
    <group position={[0, 6.4, 0]} scale={[1, .42, 1]}>
      <mesh>
        <sphereGeometry args={[12.6, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#080e16" metalness={.65} roughness={.16}
          clearcoat={1} clearcoatRoughness={.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[12.65, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#34424e" metalness={.8} roughness={.3} wireframe />
      </mesh>
    </group>
    <mesh position={[0, 6.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[12.6, .12, 8, 96]} />
      <meshStandardMaterial color="#131c26" metalness={.8} roughness={.25} />
    </mesh>
    {/* Follow the existing vestibule envelope; leave its animated door clear. */}
    {[-2.24, 2.24].map(x => <mesh key={x} position={[x, 2.95, 13.42]}>
      <boxGeometry args={[.12, 3.5, .12]} />
      <meshBasicMaterial color="#88ff24" toneMapped={false} />
    </mesh>)}
    <mesh position={[0, 4.72, 13.42]}>
      <boxGeometry args={[4.6, .14, .12]} />
      <meshBasicMaterial color="#88ff24" toneMapped={false} />
    </mesh>
  </group>;
}
