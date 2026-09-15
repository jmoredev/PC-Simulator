import { BOARD, BOARD_TOP } from '../data/components'

/** Placa base ATX de fondo. Es el elemento fijo sobre el que se monta todo. */
export function Motherboard() {
  const top = BOARD_TOP
  const centerY = top - BOARD.thickness / 2

  const standoffs: [number, number][] = [
    [-1.35, -1.05],
    [1.35, -1.05],
    [-1.35, 1.05],
    [1.35, 1.05],
    [0, 0],
    [-1.35, 0],
  ]

  return (
    <group>
      {standoffs.map(([x, z], i) => (
        <mesh key={i} position={[x, BOARD.rise / 2, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, BOARD.rise, 12]} />
          <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}

      <mesh position={[0, centerY, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOARD.width, BOARD.thickness, BOARD.depth]} />
        <meshStandardMaterial color="#14532d" metalness={0.2} roughness={0.75} />
      </mesh>
      <mesh position={[0, top + 0.002, 0]} receiveShadow>
        <boxGeometry args={[BOARD.width - 0.06, 0.004, BOARD.depth - 0.06]} />
        <meshStandardMaterial color="#166534" metalness={0.15} roughness={0.7} />
      </mesh>

      {/* Zócalo de la CPU */}
      <mesh position={[0.5, top + 0.03, -0.55]} castShadow>
        <boxGeometry args={[0.58, 0.06, 0.58]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0.5, top + 0.062, -0.55]}>
        <boxGeometry args={[0.46, 0.01, 0.46]} />
        <meshStandardMaterial color="#0b0f14" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0.5, top + 0.075, -0.88]}>
        <boxGeometry args={[0.5, 0.06, 0.08]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Ranuras DIMM */}
      {[0.95, 1.18].map((x) => (
        <group key={x}>
          <mesh position={[x, top + 0.035, -0.45]}>
            <boxGeometry args={[0.07, 0.07, 1.42]} />
            <meshStandardMaterial color="#0b0f14" metalness={0.3} roughness={0.8} />
          </mesh>
          {[-0.72, 0.72].map((z) => (
            <mesh key={z} position={[x, top + 0.05, -0.45 + z]} castShadow>
              <boxGeometry args={[0.1, 0.1, 0.12]} />
              <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Ranura M.2 */}
      <mesh position={[0.35, top + 0.02, 0.15]}>
        <boxGeometry args={[1.05, 0.04, 0.16]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Ranura PCIe x16 */}
      <mesh position={[-0.15, top + 0.035, 0.65]} castShadow>
        <boxGeometry args={[2.45, 0.07, 0.14]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[1.0, top + 0.05, 0.65]}>
        <boxGeometry args={[0.1, 0.1, 0.16]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Chipset con disipador */}
      <mesh position={[-1.05, top + 0.06, 0.65]} castShadow>
        <boxGeometry args={[0.62, 0.12, 0.62]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Disipadores VRM */}
      <mesh position={[0.5, top + 0.1, -1.05]} castShadow>
        <boxGeometry args={[0.9, 0.2, 0.22]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[1.15, top + 0.1, -0.55]} castShadow>
        <boxGeometry args={[0.22, 0.2, 0.9]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Conector de 24 pines */}
      <mesh position={[1.3, top + 0.09, 0.95]} castShadow>
        <boxGeometry args={[0.5, 0.16, 0.22]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Puerto M.2/PCIe auxiliar y conectores SATA */}
      {[-0.9, -0.75].map((z) => (
        <mesh key={z} position={[1.45, top + 0.06, z]}>
          <boxGeometry args={[0.24, 0.12, 0.14]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}
