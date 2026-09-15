import { CASE } from '../data/components'

const DECK = CASE.floor.deck
const HW = CASE.floor.width / 2
const HD = CASE.floor.depth / 2

/** Fase 2: caja abierta, tumbada sobre el banco con el interior hacia arriba. */
export function StageCase() {
  const wallH = CASE.wall.height
  const sideH = CASE.wall.sideHeight
  const t = CASE.wall.thickness

  return (
    <group>
      {/* Suelo de la caja */}
      <mesh position={[0, DECK / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[CASE.floor.width, DECK, CASE.floor.depth]} />
        <meshStandardMaterial color="#39404c" metalness={0.55} roughness={0.5} />
      </mesh>

      {/* Bandeja de la placa (zona mas clara) */}
      <mesh position={[0.15, DECK + 0.004, -0.15]} receiveShadow>
        <boxGeometry args={[3.6, 0.008, 3.0]} />
        <meshStandardMaterial color="#4b5566" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Pared frontal (boton de encendido y USB) */}
      <mesh position={[-HW, DECK + wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, wallH, CASE.floor.depth]} />
        <meshStandardMaterial color="#2e343d" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh
        position={[-HW - 0.09, DECK + wallH * 0.72, -1.4]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.11, 0.11, 0.05, 20]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.4}
          metalness={0.4}
        />
      </mesh>
      {[-0.9, -0.6].map((z) => (
        <mesh key={z} position={[-HW - 0.09, DECK + wallH * 0.42, z + 0.4]}>
          <boxGeometry args={[0.05, 0.14, 0.34]} />
          <meshStandardMaterial color="#0f1319" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      {/* Pared trasera (salidas de expansion) */}
      <mesh position={[HW, DECK + wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, wallH, CASE.floor.depth]} />
        <meshStandardMaterial color="#2e343d" metalness={0.6} roughness={0.45} />
      </mesh>
      {[-1.9, -1.55, -1.2, -0.85, -0.5, -0.15].map((z) => (
        <mesh key={z} position={[HW + 0.07, DECK + wallH * 0.34, z]}>
          <boxGeometry args={[0.06, 0.16, 0.32]} />
          <meshStandardMaterial color="#4d5563" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}

      {/* Paredes laterales */}
      {[-HD, HD].map((z) => (
        <mesh key={z} position={[0, DECK + sideH / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[CASE.floor.width - t * 2, sideH, t]} />
          <meshStandardMaterial color="#2e343d" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}

      {/* Soporte de la fuente de alimentacion */}
      <mesh position={[-2.25, DECK + 0.015, -0.1]} receiveShadow>
        <boxGeometry args={[1.7, 0.03, 1.8]} />
        <meshStandardMaterial color="#4b5566" metalness={0.55} roughness={0.5} />
      </mesh>

      {/* Rejillas de los ventiladores */}
      {[1.1, -1.5].map((z) => (
        <mesh key={z} position={[2.25, DECK + 0.012, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.56, 0.05, 8, 32]} />
          <meshStandardMaterial color="#5a6577" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}
