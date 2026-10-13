import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { connectorImageUrl } from '../data/assets'
import { COMPONENT_BY_ID } from '../data/components'
import { ComponentVisual } from '../three/ComponentModel'
import type { GameMode } from '../types'

/**
 * Ventanita con la pieza seleccionada ampliada. En la fase 1 están todas sobre la
 * mesa y algunas —los conectores— se ven muy pequeñas: aquí se ven enteras.
 *
 * Para los conectores con imagen propia se usa el PNG (más nítido que el dibujo
 * 3D); para el resto, una vista 3D de cerca con la misma pieza que se arrastra.
 *
 * En examen no se escribe el nombre: decir qué pieza es también es una pista
 * (misma regla que en la barra de estado).
 */
export function ComponentZoom({ id, mode }: { id: string; mode: GameMode }) {
  const def = COMPONENT_BY_ID[id]
  if (!def) return null

  const image = def.category === 'conector' ? connectorImageUrl(def.kind) : undefined
  // La pieza se dibuja a un tamaño parecido en la ventanita sea cual sea su
  // `size` (los modelos se autoajustan a `def.size`; los conectores procedurales
  // son más pequeños y se agrandan con este factor).
  const scale = 1.15 / Math.max(0.12, def.size)

  return (
    <div className="zoom">
      <div className="zoom__view">
        {image ? (
          <img className="zoom__img" src={image} alt="" draggable={false} />
        ) : (
          <Canvas camera={{ position: [0, 0.3, 2.3], fov: 35 }} dpr={[1, 2]}>
            <ambientLight intensity={1.15} />
            <directionalLight position={[2, 3, 4]} intensity={1.9} />
            <directionalLight position={[-2, 1, -3]} intensity={0.7} />
            <Suspense fallback={null}>
              <group scale={scale}>
                <ComponentVisual def={def} />
              </group>
            </Suspense>
          </Canvas>
        )}
      </div>
      {mode === 'practice' && <span className="zoom__name">{def.name}</span>}
    </div>
  )
}
