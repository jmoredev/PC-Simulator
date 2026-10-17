import { Component, Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { connectorImageUrl, modelUrl, type ModelSpec } from '../data/assets'
import { BOARD_MODEL } from '../data/components'
import type { ComponentDef, Vec3 } from '../types'
import { Motherboard } from './Motherboard'
import { Placeholder } from './Placeholder'

const IDENTITY: Vec3 = [0, 0, 0]

/**
 * Caja envolvente de un grupo **en su propio espacio**.
 *
 * `Box3.setFromObject` mide en coordenadas de MUNDO, así que incluye dónde está
 * colocada la pieza: al centrar con ese resultado, la pieza acababa en el origen
 * del mundo —el centro de la mesa— en vez de en su celda. Solo se notaba en las
 * piezas procedurales (los cuatro conectores sin PNG ni .glb), que son las únicas
 * que pasan por `Align` colocadas fuera del origen: los `.glb` se ajustan dentro
 * de `GltfModel` y los conectores con imagen son un plano que no se alinea.
 *
 * Se mide multiplicando la caja de cada malla por su matriz relativa al grupo
 * (mundo → grupo), que es lo que ignora a los padres.
 */
function localBox(group: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  const alGrupo = new THREE.Matrix4().copy(group.matrixWorld).invert()
  const matriz = new THREE.Matrix4()
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    mesh.geometry.computeBoundingBox()
    const bb = mesh.geometry.boundingBox
    if (!bb) return
    matriz.multiplyMatrices(alGrupo, mesh.matrixWorld)
    box.union(bb.clone().applyMatrix4(matriz))
  })
  return box
}

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
    // Los padres primero: la caja local necesita la matriz de mundo del grupo.
    group.updateWorldMatrix(true, true)
    const box = localBox(group)
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
 *
 * Ojo: el cálculo se memoriza por [scene, target, rotation], así que quien
 * pase `rotation` debe dar un array NUEVO en cada cambio (mismo contenido
 * pero otra referencia) o el modelo no se actualizará.
 */
export function GltfModel({ url, target, rotation }: { url: string; target: number; rotation: Vec3 }) {
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
export function ModelOrFallback({
  spec,
  fallback,
  rotation = IDENTITY,
}: {
  spec: ModelSpec & { size: number }
  fallback: ReactNode
  rotation?: Vec3
}) {
  const url = modelUrl(spec)
  const aligned = <Align rotation={rotation}>{fallback}</Align>
  if (!url) return aligned
  return (
    <Suspense fallback={aligned}>
      <ModelErrorBoundary fallback={aligned}>
        <GltfModel url={url} target={spec.size} rotation={rotation} />
      </ModelErrorBoundary>
    </Suspense>
  )
}

/**
 * Conector de la fase 2 dibujado con su imagen PNG, tumbada en el plano.
 * Se conserva la proporción de la imagen y su dimensión mayor es `def.size`.
 */
function ConnectorImage({ def, vertical }: { def: ComponentDef; vertical?: boolean }) {
  const url = connectorImageUrl(def.kind)
  const texture = useTexture(url ?? '', (loaded) => {
    const tex = Array.isArray(loaded) ? loaded[0] : loaded
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
  })

  const { w, d } = useMemo(() => {
    const image = texture.image as { width?: number; height?: number } | undefined
    const ratio = (image?.height ?? 1) / (image?.width ?? 1) || 1
    const max = def.size
    return ratio >= 1 ? { w: max / ratio, d: max } : { w: max, d: max * ratio }
  }, [texture, def.size])

  return (
    <mesh
      rotation={vertical ? [0, -Math.PI / 2, 0] : [-Math.PI / 2, 0, 0]}
      position={vertical ? [-0.006, 0, 0] : [0, 0.004, 0]}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.02}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/** Solo la placa base, sin nada montado encima. */
export function BoardBase() {
  return (
    <group name="board">
      <ModelOrFallback
        spec={BOARD_MODEL}
        fallback={<Motherboard />}
        rotation={BOARD_MODEL.rotation}
      />
    </group>
  )
}

/**
 * Muestra el modelo real si existe; si no, la geometría procedural.
 * Gracias al ErrorBoundary, un .glb que falte no rompe la aplicación.
 */
export function ComponentVisual({
  def,
  yaw = 0,
  vertical = false,
}: {
  def: ComponentDef
  yaw?: number
  vertical?: boolean
}) {
  const r = def.rotation ?? IDENTITY
  const fallback = <Placeholder def={def} />

  const body =
    def.category === 'conector' && connectorImageUrl(def.kind) ? (
      <Suspense fallback={<Align rotation={r}>{fallback}</Align>}>
        <ModelErrorBoundary fallback={<Align rotation={r}>{fallback}</Align>}>
          <ConnectorImage def={def} vertical={vertical} />
        </ModelErrorBoundary>
      </Suspense>
    ) : (
      <ModelOrFallback spec={def} fallback={fallback} rotation={r} />
    )

  // El giro de la ranura se aplica por fuera de la rotación del modelo: así la
  // pieza gira sobre la vertical aunque su modelo venga tumbado (RAM).
  return <group rotation={[0, yaw, 0]}>{body}</group>
}
