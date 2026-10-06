import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { MOUNTS_BY_STAGE } from '../data/components'
import { useGameStore } from '../store/useGameStore'

/**
 * Fase de identificación: sobre la mesa, un cartel con el nombre de cada pieza.
 * Los carteles se ven siempre (son las respuestas entre las que elegir) y se
 * ponen en verde cuando ya tienen su pieza.
 */
export function StageIdentify() {
  const placed = useGameStore((s) => s.placed)
  return (
    <group>
      {MOUNTS_BY_STAGE.identify.map((mount) => {
        const [w, d] = mount.size
        const done = !!placed[mount.id]
        return (
          <group
            key={mount.id}
            position={[mount.position[0], 0.02, mount.position[2]]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color={done ? '#166534' : '#26303e'} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w - 0.06, d - 0.06]} />
              <meshStandardMaterial color={done ? '#22c55e' : '#334155'} side={THREE.DoubleSide} />
            </mesh>
            <Html center position={[0, 0.01, 0]} style={{ pointerEvents: 'none' }}>
              <div className={`identify-tag${done ? ' identify-tag--done' : ''}`}>
                {mount.label}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
