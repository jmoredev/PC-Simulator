import { Suspense, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { connectorImageUrl } from '../data/assets'
import { COMPONENT_BY_ID } from '../data/components'
import { ComponentVisual } from '../three/ComponentModel'
import type { GameMode } from '../types'

/** Dirección desde la que se mira la pieza: tres cuartos desde arriba. */
const MIRADA = new THREE.Vector3(0.45, 0.72, 0.85).normalize()

/**
 * Encuadra la pieza: mide su caja envolvente real y coloca la cámara mirando a su
 * centro desde tres cuartos, a la distancia que la deja entera.
 *
 * Hace falta porque las piezas no comparten forma ni orientación: la CPU y el SSD
 * van tumbados (de frente solo se ve el canto), el disipador es bajito (de frente
 * se ve su parte de abajo) y los altavoces miran hacia atrás. Y la distancia se
 * mide en vez de estimarse porque la RAM es larga y estrecha: con perspectiva su
 * extremo cercano se agranda, así que el margen tiene que cubrir el radio ENTERO
 * visto desde el lado próximo (de ahí el 1,6).
 *
 * Se hace una sola vez, en el primer fotograma en que la pieza ya tiene geometría
 * (con `Suspense` los primeros fotogramas están vacíos), y con `key` por pieza
 * para que cada una se encuadre al seleccionarla.
 */
function Encuadre({ children }: { children: ReactNode }) {
  const camera = useThree((s) => s.camera)
  const grupo = useRef<THREE.Group>(null)
  const listo = useRef(false)

  useFrame(() => {
    if (listo.current) return
    const g = grupo.current
    if (!g) return
    const caja = new THREE.Box3().setFromObject(g)
    if (caja.isEmpty()) return
    const centro = caja.getCenter(new THREE.Vector3())
    const radio = caja.getSize(new THREE.Vector3()).length() / 2 || 0.2
    const fov = 'fov' in camera ? camera.fov : 30
    const distancia = (radio / Math.tan((fov * Math.PI) / 360)) * 1.6
    camera.position.copy(centro).addScaledVector(MIRADA, distancia)
    camera.lookAt(centro)
    camera.updateProjectionMatrix()
    listo.current = true
  })

  return <group ref={grupo}>{children}</group>
}

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
          <Canvas camera={{ position: [1.8, 2.9, 3.4], fov: 30 }} dpr={[1, 2]} frameloop="demand">
            {/* `demand`: la escena del zoom es estática tras el primer encuadre, así
                que no hay que mantener un bucle de render propio (y menos en los
                portátiles modestos que busca el proyecto). r3f renderiza al montar
                y cuando llega el modelo, que es cuando `Encuadre` necesita su
                fotograma. */}
            <ambientLight intensity={1.15} />
            <directionalLight position={[2, 3, 4]} intensity={1.9} />
            <directionalLight position={[-2, 1, -3]} intensity={0.7} />
            <Suspense fallback={null}>
              <Encuadre key={def.id}>
                <group scale={scale}>
                  <ComponentVisual def={def} />
                </group>
              </Encuadre>
            </Suspense>
          </Canvas>
        )}
      </div>
      {mode === 'practice' && <span className="zoom__name">{def.name}</span>}
    </div>
  )
}
