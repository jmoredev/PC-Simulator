import { BoardBase } from './ComponentModel'

/** Fase 1: la placa base sobre la alfombrilla antiestática antes de montar. */
export function StageBoard() {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.02, 3.5]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.1} roughness={0.9} />
      </mesh>
      <BoardBase />
    </group>
  )
}
