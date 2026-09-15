import { Component, Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { modelUrl } from '../data/assets'
import { BOARD_MOUNT_IDS, COMPONENT_BY_ID, MOUNT_BY_ID } from '../data/components'
import { useGameStore } from '../store/useGameStore'
import type { ComponentDef, Vec3 } from '../types'
import { Motherboard } from './Motherboard'
import { Placeholder } from './Placeholder'

const IDENTITY: Vec3 = [0, 0, 0]

/**
 * Gira un objeto ligero (placeholder) y lo reajusta: centrado en XZ y con la
 * base en y=0. Los modelos .glb se ajustan dentro de GltfModel, que memoriza
 * el cálculo para no recorrer la geometría en cada frame.
 */
function Align({ rotation, children }: { rotation: Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const group = ref.current
    if (!group) return
    group.rotation.set(...rotation)
    group.position.set(0, 0, 0)
    group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(group)
    const center = box.getCenter(new THREE.Vector3())
    group.position.set(-center.x, -box.min.y, -center.z)
    group.updateMatrixWorld(true)
  }, [rotation, children])
  return <group ref={ref}>{children}</group>
}

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
 * Carga un .glb, lo gira, lo centra y lo escala para que ocupe `target`
 * unidades con la base en y=0. Así cualquier modelo sirve tal cual llegue.
 */
function GltfModel({ url, target, rotation }: { url: string; target: number; rotation: Vec3 }) {
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
    inner.rotation.set(...rotation)
    inner.position.set(0, 0, 0)
    inner.updateMatrixWorld(true)

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
  }, [scene, target, rotation])

  return <primitive object={group} />
}

/** Modelo real si existe; si no, el `fallback` indicado (ya alineado). */
function ModelOrFallback({
  def,
  fallback,
  rotation = IDENTITY,
}: {
  def: ComponentDef
  fallback: ReactNode
  rotation?: Vec3
}) {
  const url = modelUrl(def)
  const aligned = <Align rotation={rotation}>{fallback}</Align>
  if (!url) return aligned
  return (
    <Suspense fallback={aligned}>
      <ModelErrorBoundary fallback={aligned}>
        <GltfModel url={url} target={def.size} rotation={rotation} />
      </ModelErrorBoundary>
    </Suspense>
  )
}

/** Solo la placa base, sin nada montado encima. */
export function BoardBase() {
  const motherboard = COMPONENT_BY_ID.motherboard
  if (!motherboard) return <Motherboard />
  return (
    <group name="board">
      <ModelOrFallback
        def={motherboard}
        fallback={<Motherboard />}
        rotation={motherboard.rotation ?? IDENTITY}
      />
    </group>
  )
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
            <ComponentVisual def={def} yaw={mount.angle ?? 0} />
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
export function ComponentVisual({ def, yaw = 0 }: { def: ComponentDef; yaw?: number }) {
  if (def.kind === 'motherboard') return <BoardAssembly />
  const r = def.rotation ?? IDENTITY
  const rotation: Vec3 = [r[0], r[1] + yaw, r[2]]
  return (
    <ModelOrFallback
      def={def}
      fallback={<Placeholder def={def} />}
      rotation={rotation}
    />
  )
}
