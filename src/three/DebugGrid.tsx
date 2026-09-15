import type { ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { DEBUG } from '../calibration'

const HALF = 2
const STEP = 0.25
const Y = 0.021

/** Rejilla con coordenadas sobre el plano de la placa, para ajustar huecos. */
export function DebugGrid() {
  if (!DEBUG) return null

  const lines: ReactNode[] = []
  const count = Math.round(HALF / STEP)
  for (let i = -count; i <= count; i++) {
    const v = i * STEP
    const major = i % 2 === 0
    const color = major ? '#f59e0b' : '#64748b'
    lines.push(
      <mesh key={`x${i}`} position={[v, Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[major ? 0.008 : 0.003, HALF * 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
      </mesh>,
      <mesh key={`z${i}`} position={[0, Y, v]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF * 2, major ? 0.008 : 0.003]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
      </mesh>,
    )
  }

  const labels: ReactNode[] = []
  for (let i = -HALF; i <= HALF; i++) {
    labels.push(
      <Html key={`lx${i}`} center position={[i, 0.05, -HALF - 0.15]} style={{ pointerEvents: 'none' }}>
        <div className="debug-label">x={i}</div>
      </Html>,
      <Html key={`lz${i}`} center position={[HALF + 0.2, 0.05, i]} style={{ pointerEvents: 'none' }}>
        <div className="debug-label">z={i}</div>
      </Html>,
    )
  }

  return (
    <group>
      {lines}
      {labels}
    </group>
  )
}
