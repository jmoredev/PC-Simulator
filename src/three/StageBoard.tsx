import { BoardBase } from './ComponentModel'

/** Fase 1: la placa base sobre la alfombrilla antiestática antes de montar. */
export function StageBoard() {
  return (
    <group>
      {/* La alfombrilla queda por debajo de y=0 para no tapar ni hacer
          parpadear a las placas cuyo modelo es una cara plana. */}
      <mesh position={[0, -0.008, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.008, 3.5]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.1} roughness={0.9} />
      </mesh>
      <BoardBase />
    </group>
  )
}
