import { useEffect, useMemo, useRef } from 'react'
import { Html, OrbitControls, Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import {
  BOARD_MODEL,
  COMPONENTS_BY_STAGE,
  COMPONENT_BY_ID,
  MOUNT_BY_ID,
  MOUNTS_BY_STAGE,
  ROTATION_TARGETS,
  rotationPreviewDef,
  trayPanelFor,
  trayScaleFor,
} from '../data/components'
import { STAGES, REAR_CAMERA } from '../data/stages'
import { useCurrentStage, useGameStore, placedInStage } from '../store/useGameStore'
import { useCalibrationStore } from '../store/useCalibrationStore'
import type { ComponentDef, Stage, Vec3 } from '../types'
import { ComponentVisual, ModelOrFallback } from './ComponentModel'
import { ConnectorPlug } from './ConnectorPlug'
import { CALIBRATE, DEBUG, rearCameraFrom } from '../calibration'
import { BOARD } from '../data/boards'
import { connectorImageUrl } from '../data/assets'
import { portSize } from '../data/ports'
import { CalibrationPicker } from './CalibrationPicker'
import { DebugGrid } from './DebugGrid'
import { Motherboard } from './Motherboard'
import { MountZone } from './MountZone'
import { StageBoard } from './StageBoard'
import { StageIdentify } from './StageIdentify'
import { StagePeripherals } from './StagePeripherals'
import { StagePorts } from './StagePorts'
import { Ball, Cyl } from './primitives'

const HIT = new THREE.Vector3()
const NDC = new THREE.Vector2()

/** Plano sobre el que se proyecta el puntero al arrastrar. */
function dropPlaneFor(stage: Stage): THREE.Plane {
  return stage.drop.kind === 'vertical'
    ? new THREE.Plane(new THREE.Vector3(1, 0, 0), -stage.drop.x)
    : new THREE.Plane(new THREE.Vector3(0, 1, 0), -stage.drop.y)
}

/** ¿La fase se juega sobre un plano vertical (chapa trasera de frente)? */
const isVertical = (stage: Stage) => stage.drop.kind === 'vertical'

/** Cámara de la pestaña «Rotaciones»: el modelo centrado, a media distancia. */
const ROTATION_VIEW = {
  position: [2.4, 1.9, 2.9] as [number, number, number],
  target: [0, 0.3, 0] as [number, number, number],
}

/** Suelo neutro de la pestaña «Rotaciones», con rejilla de referencia. */
function RotationGround() {
  return (
    <group>
      <mesh position={[0, -0.086, 0]} receiveShadow>
        <boxGeometry args={[6, 0.16, 6]} />
        <meshStandardMaterial color="#252a33" metalness={0.2} roughness={0.85} />
      </mesh>
      <gridHelper args={[6, 12, '#3b4453', '#2e3542']} />
    </group>
  )
}

/** Triada de ejes (X rojo, Y verde, Z azul) en una esquina del suelo. */
function AxesGizmo() {
  const L = 0.55
  return (
    <group position={[-2.3, 0.002, -2.3]}>
      <Ball radius={0.035} c="#94a3b8" />
      <Cyl rt={0.022} rb={0.022} h={L} p={[L / 2, 0, 0]} rot={[0, 0, -Math.PI / 2]} c="#ef4444" />
      <Cyl rt={0} rb={0.05} h={0.12} p={[L + 0.06, 0, 0]} rot={[0, 0, -Math.PI / 2]} c="#ef4444" />
      <Cyl rt={0.022} rb={0.022} h={L} p={[0, L / 2, 0]} c="#22c55e" />
      <Cyl rt={0} rb={0.05} h={0.12} p={[0, L + 0.06, 0]} c="#22c55e" />
      <Cyl rt={0.022} rb={0.022} h={L} p={[0, 0, L / 2]} rot={[Math.PI / 2, 0, 0]} c="#3b82f6" />
      <Cyl rt={0} rb={0.05} h={0.12} p={[0, 0, L + 0.06]} rot={[Math.PI / 2, 0, 0]} c="#3b82f6" />
      <Html center position={[L + 0.28, 0, 0]} style={{ pointerEvents: 'none' }}>
        <div className="axis-label axis-label--x">X</div>
      </Html>
      <Html center position={[0, L + 0.28, 0]} style={{ pointerEvents: 'none' }}>
        <div className="axis-label axis-label--y">Y</div>
      </Html>
      <Html center position={[0, 0, L + 0.28]} style={{ pointerEvents: 'none' }}>
        <div className="axis-label axis-label--z">Z</div>
      </Html>
    </group>
  )
}

/** Solo el modelo del objetivo elegido, girado con su calibración en vivo. */
function RotationPreview() {
  const selected = useCalibrationStore((s) => s.selectedTarget)
  const rotations = useCalibrationStore((s) => s.rotations)
  const target = ROTATION_TARGETS.find((t) => t.key === selected) ?? ROTATION_TARGETS[0]
  if (!target) return null
  const stored = rotations[target.key]
  // Array nuevo en cada render: GltfModel memoriza por [scene, target, rotation].
  const rotation: Vec3 = stored ? [...stored] : [...target.baseRotation]
  return (
    <group>
      <RotationGround />
      <AxesGizmo />
      {target.kind ? (
        <ComponentVisual def={rotationPreviewDef(target, rotation)} />
      ) : (
        <ModelOrFallback spec={BOARD_MODEL} fallback={<Motherboard />} rotation={rotation} />
      )}
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#dbeafe', '#1f2937', 0.7]} />
      <directionalLight
        position={[6, 11, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      >
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.5, 45]} />
      </directionalLight>
      <directionalLight position={[-6, 7, -3]} intensity={0.5} color="#bfdbfe" />
      <pointLight position={[-4, 4, 3]} intensity={22} color="#a5d8ff" />
    </>
  )
}

/**
 * Entorno de estudio para los reflejos. Algunos modelos traen materiales
 * metálicos (la chapa de la placa) y sin entorno se verían planos y apagados.
 * Se genera con luces, sin descargar ningún HDRI.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={64} frames={1}>
      <Lightformer form="rect" intensity={2.5} position={[0, 5, 4]} scale={[10, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.2} position={[-5, 3, -3]} scale={[8, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={2} position={[4, 3, 2]} scale={5} />
    </Environment>
  )
}

function Bench({ stage }: { stage: Stage }) {
  const { width, depth, center } = stage.bench
  const grid = Math.max(width, depth)
  // La cara superior queda un poco por debajo de y=0 para que nada que se
  // apoye en el banco (piezas, alfombrilla, caras planas de los modelos)
  // quede coplanario con él y parpadee.
  return (
    <group>
      <mesh position={[center[0], -0.172, center[1]]} receiveShadow>
        <boxGeometry args={[width, 0.32, depth]} />
        <meshStandardMaterial color="#252a33" metalness={0.2} roughness={0.85} />
      </mesh>
      <gridHelper
        args={[grid, Math.round(grid * 2), '#3b4453', '#2e3542']}
        position={[center[0], -0.002, center[1]]}
      />
    </group>
  )
}

function TrayPanel({ stage }: { stage: Stage }) {
  const defs = COMPONENTS_BY_STAGE[stage.id]
  const panel = useMemo(() => trayPanelFor(stage.id), [stage.id])
  if (defs.length === 0) return null
  return (
    <group position={[panel.center[0], 0, panel.center[1]]}>
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[panel.size[0] + 0.1, 0.06, panel.size[1] + 0.1]} />
        <meshStandardMaterial color="#1f2937" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[panel.size[0] + 0.24, 0.02, panel.size[1] + 0.24]} />
        <meshStandardMaterial color="#334155" metalness={0.2} roughness={0.8} />
      </mesh>
      <Html
        center
        position={[panel.size[0] / 2 + 0.15, 0.85, panel.size[1] / 2]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="tray-label">BANDEJA DE COMPONENTES</div>
      </Html>
    </group>
  )
}

function PlacedComponents() {
  const placed = useGameStore((s) => s.placed)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const stage = STAGES[stageIndex]
  const mounts = MOUNTS_BY_STAGE[stage.id]
  const vertical = isVertical(stage)
  // En la identificación no se deja la pieza encima: el cartel se marca en verde.
  if (stage.id === 'identify') return null
  return (
    <>
      {mounts.map((mount) => {
        const componentId = placed[mount.id]
        if (!componentId) return null
        const def = COMPONENT_BY_ID[componentId]
        if (!def) return null
        return (
          <group key={mount.id} position={mount.position}>
            {vertical && def.category === 'conector' ? (
              <ConnectorPlug def={def} size={mount.size} />
            ) : (
              <ComponentVisual def={def} yaw={mount.angle ?? 0} vertical={vertical} />
            )}
          </group>
        )
      })}
    </>
  )
}

function MountZones() {
  const stageIndex = useGameStore((s) => s.stageIndex)
  const mounts = MOUNTS_BY_STAGE[STAGES[stageIndex].id]
  return (
    <>
      {mounts.map((mount) => (
        <MountZone key={mount.id} mount={mount} />
      ))}
    </>
  )
}

function TrayItem({ def }: { def: ComponentDef }) {
  const selected = useGameStore((s) => s.selectedId === def.id)
  const scale = trayScaleFor(def)
  const beginDrag = useGameStore((s) => s.beginDrag)
  const stage = useCurrentStage()
  const [x, z] =
    stage.id === 'identify' ? (def.identifyPos ?? def.trayPos) : def.trayPos

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (useGameStore.getState().dragging) return
    event.stopPropagation()
    beginDrag(def.id, event.point.x, event.point.z)
  }

  return (
    <group
      position={[x, stage.tray.surfaceY, z]}
      onPointerDown={handlePointerDown}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'grab'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <group scale={scale}>
        <ComponentVisual def={def} yaw={MOUNT_BY_ID[def.mountId ?? '']?.angle ?? 0} />
      </group>
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.6, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function Tray({ stage }: { stage: Stage }) {
  const placed = useGameStore((s) => s.placed)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const placedIds = placedInStage(placed, stageIndex)
  const remaining = COMPONENTS_BY_STAGE[stage.id].filter((c) => !placedIds.has(c.id))
  return (
    <>
      {remaining.map((def) => (
        <TrayItem key={def.id} def={def} />
      ))}
    </>
  )
}

function DragGhost({ stage }: { stage: Stage }) {
  const dragging = useGameStore((s) => s.dragging)
  const selectedId = useGameStore((s) => s.selectedId)
  const dragPos = useGameStore((s) => s.dragPos)
  const hoverMountId = useGameStore((s) => s.hoverMountId)

  if (!dragging || !selectedId) return null
  const def = COMPONENT_BY_ID[selectedId]
  if (!def) return null

  const vertical = isVertical(stage)
  const mount = hoverMountId ? MOUNT_BY_ID[hoverMountId] : null
  // Conectores sin imagen PNG: usan el enchufe 3D (ConnectorPlug) anclado al
  // cursor, igual que quedará colocado, en vez del placeholder procedural que
  // se dibujaba desplazado en el plano vertical.
  const usePlug =
    vertical && def.category === 'conector' && !connectorImageUrl(def.kind)

  let position: [number, number, number]
  if (mount) {
    position = usePlug
      ? [mount.position[0], mount.position[1], mount.position[2]]
      : vertical
        ? [mount.position[0] - 0.12, mount.position[1], mount.position[2]]
        : [mount.position[0], mount.position[1] + 0.05, mount.position[2]]
  } else if (stage.drop.kind === 'vertical') {
    position = usePlug
      ? [stage.drop.x, dragPos[0], dragPos[1]]
      : [stage.drop.x - 0.12, dragPos[0], dragPos[1]]
  } else {
    position = [dragPos[0], stage.drop.y + 0.08, dragPos[1]]
  }

  return (
    <group position={position}>
      {usePlug ? (
        <ConnectorPlug def={def} size={mount?.size ?? portSize(def.kind)} />
      ) : (
        <ComponentVisual
          def={def}
          yaw={mount?.angle ?? MOUNT_BY_ID[def.mountId ?? '']?.angle ?? 0}
          vertical={vertical}
        />
      )}
      <mesh
        position={[0, 0.01, 0]}
        rotation={vertical ? [0, -Math.PI / 2, 0] : [-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={vertical ? [0.1, 0.13, 32] : [0.42, 0.5, 32]} />
        <meshBasicMaterial
          color={mount ? '#22c55e' : '#38bdf8'}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function DragController({ stage }: { stage: Stage }) {
  const dragging = useGameStore((s) => s.dragging)
  const { camera, gl, raycaster } = useThree()

  useEffect(() => {
    if (!dragging) return
    const plane = dropPlaneFor(stage)
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      NDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      NDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(NDC, camera)
      const hit = raycaster.ray.intersectPlane(plane, HIT)
      if (!hit) return
      if (stage.drop.kind === 'vertical') useGameStore.getState().updateDrag(hit.y, hit.z)
      else useGameStore.getState().updateDrag(hit.x, hit.z)
    }
    const onUp = () => useGameStore.getState().endDrag()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, camera, gl, raycaster, stage])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const state = useGameStore.getState()
      state.cancelDrag()
      state.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return null
}

function CameraRig({ stage }: { stage: Stage }) {
  const dragging = useGameStore((s) => s.dragging)
  const armed = useCalibrationStore((s) => s.armed)
  const points = useCalibrationStore((s) => s.points)
  const rotationTab = useCalibrationStore((s) => s.tab) === 'rotations'
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const { camera } = useThree()
  const TOP_VIEW = {
    position: [0, 7.4, 2.0] as [number, number, number],
    target: [0, 0, 0.1] as [number, number, number],
  }
  // Al marcar la chapa trasera o sus puertos, el calibrador se pone de frente.
  // Si la placa aún no tiene chapa registrada, la cámara sale de los dos puntos
  // que se acaban de marcar.
  const calibratingRear = armed === 'rear_area' || armed === 'port'
  const rearCalView = rearCameraFrom(points) ?? (BOARD.rear ? REAR_CAMERA : TOP_VIEW)
  const view = CALIBRATE
    ? rotationTab
      ? ROTATION_VIEW
      : calibratingRear
        ? rearCalView
        : TOP_VIEW
    : stage.camera
  const desiredPos = useRef(new THREE.Vector3(...view.position))
  const desiredTarget = useRef(new THREE.Vector3(...view.target))
  const animating = useRef(false)

  useEffect(() => {
    desiredPos.current.set(...view.position)
    desiredTarget.current.set(...view.target)
    animating.current = true
  }, [stage.id, view])

  useFrame((_, delta) => {
    const c = controls.current
    if (!animating.current || !c) return
    const k = Math.min(1, delta * 5)
    camera.position.lerp(desiredPos.current, k)
    c.target.lerp(desiredTarget.current, k)
    c.update()
    if (camera.position.distanceTo(desiredPos.current) < 0.04) {
      animating.current = false
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!dragging}
      minDistance={3}
      maxDistance={24}
      maxPolarAngle={Math.PI / 2.12}
    />
  )
}

function StageContent({ stage }: { stage: Stage }) {
  if (stage.id === 'identify') return <StageIdentify />
  if (stage.id === 'board') return <StageBoard />
  if (stage.id === 'ports') return <StagePorts />
  return <StagePeripherals />
}

export function Scene() {
  const stage = useCurrentStage()
  const rotationTab = useCalibrationStore((s) => s.tab) === 'rotations'

  if (CALIBRATE) {
    if (rotationTab) {
      return (
        <>
          <Lights />
          <StudioEnvironment />
          <RotationPreview />
          <CameraRig stage={stage} />
        </>
      )
    }
    return (
      <>
        <Lights />
        <StudioEnvironment />
        <Bench stage={stage} />
        <StageBoard />
        <DebugGrid />
        <CalibrationPicker />
        <CameraRig stage={stage} />
      </>
    )
  }

  return (
    <>
      <Lights />
      <StudioEnvironment />
      <Bench stage={stage} />
      <StageContent stage={stage} />
      {!isVertical(stage) && stage.id !== 'identify' && <TrayPanel stage={stage} />}
      <MountZones />
      <PlacedComponents />
      {!isVertical(stage) && <Tray stage={stage} />}
      <DragGhost stage={stage} />
      <DragController stage={stage} />
      {DEBUG && <DebugGrid />}
      <CameraRig stage={stage} />
    </>
  )
}
