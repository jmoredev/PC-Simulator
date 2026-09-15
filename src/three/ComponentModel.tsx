import { Component, Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { modelUrl } from '../data/assets'
import { BOARD_MOUNT_IDS, COMPONENT_BY_ID, MOUNT_BY_ID } from '../data/components'
import { useGameStore } from '../store/useGameStore'
import type { ComponentDef } from '../types'
import { Motherboard } from './Motherboard'
import { Placeholder } from './Placeholder'

class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    // Sin modelos disponibles: se usa el placeholder procedural.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Carga un .glb, lo centra y lo escala para que ocupe `target` unidades.
 * Así cualquier modelo sirve sin necesidad de ajustarlo a mano.
 */
function GltfModel({ url, target }: { url: string; target: number }) {
  const { scene } = useGLTF(url)

  const group = useMemo(() => {
    const inner = scene.clone(true)
    inner.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    const box = new THREE.Box3().setFromObject(inner)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const scale = target / maxDim

    inner.position.set(-center.x, -box.min.y, -center.z)

    const scaler = new THREE.Group()
    scaler.scale.setScalar(scale)
    scaler.add(inner)
    return scaler
  }, [scene, target])

  return <primitive object={group} />
}

/** Modelo real si existe; si no, el `fallback` indicado. */
function ModelOrFallback({
  def,
  fallback,
}: {
  def: ComponentDef
  fallback: ReactNode
}) {
  const url = modelUrl(def)
  if (!url) return <>{fallback}</>
  return (
    <Suspense fallback={fallback}>
      <ModelErrorBoundary fallback={fallback}>
        <GltfModel url={url} target={def.size} />
      </ModelErrorBoundary>
    </Suspense>
  )
}

/** Solo la placa base, sin nada montado encima. */
export function BoardBase() {
  const motherboard = COMPONENT_BY_ID.motherboard
  if (!motherboard) return <Motherboard />
  return <ModelOrFallback def={motherboard} fallback={<Motherboard />} />
}

/**
 * Placa base con todo lo que ya se ha montado encima (fase 1).
 * Es la pieza que se instala dentro de la caja en la fase 2.
 */
export function BoardAssembly() {
  const placed = useGameStore((s) => s.placed)

  return (
    <group>
      <BoardBase />
      {BOARD_MOUNT_IDS.map((mountId) => {
        const componentId = placed[mountId]
        if (!componentId) return null
        const mount = MOUNT_BY_ID[mountId]
        const def = COMPONENT_BY_ID[componentId]
        if (!mount || !def) return null
        return (
          <group key={mountId} position={mount.position}>
            <ComponentVisual def={def} />
          </group>
        )
      })}
    </group>
  )
}

/**
 * Muestra el modelo real si existe; si no, la geometría procedural.
 * Gracias al ErrorBoundary, un .glb que falte no rompe la aplicación.
 */
export function ComponentVisual({ def }: { def: ComponentDef }) {
  if (def.kind === 'motherboard') {
    return <ModelOrFallback def={def} fallback={<BoardAssembly />} />
  }
  return <ModelOrFallback def={def} fallback={<Placeholder def={def} />} />
}
