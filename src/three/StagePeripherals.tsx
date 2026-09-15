import { DESK } from '../data/components'

/** Fase 3: el PC ya montado, en forma de torre, junto al escritorio. */
export function StagePeripherals() {
  const { position, width, height, depth } = DESK.tower
  const [x, , z] = position

  return (
    <group position={[x, 0, z]}>
      {/* Cuerpo de la torre */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#20242b" metalness={0.6} roughness={0.45} />
      </mesh>

      {/* Frente con boton de encendido y USB */}
      <mesh position={[0, height / 2, depth / 2 + 0.02]}>
        <boxGeometry args={[width - 0.1, height - 0.15, 0.06]} />
        <meshStandardMaterial color="#171b21" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-0.7, height - 0.35, depth / 2 + 0.09]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 18]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.6}
        />
      </mesh>
      {[0.05, 0.4].map((dx) => (
        <mesh key={dx} position={[dx, height - 0.35, depth / 2 + 0.07]}>
          <boxGeometry args={[0.24, 0.1, 0.05]} />
          <meshStandardMaterial color="#0f1319" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      {/* Lateral con ventana (mirando hacia el escritorio) */}
      <mesh position={[width / 2 + 0.03, height / 2, 0]}>
        <boxGeometry args={[0.05, height - 0.5, depth - 0.5]} />
        <meshStandardMaterial
          color="#0b1b26"
          metalness={0.6}
          roughness={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}
