import { useEffect, useMemo, useRef } from 'react'
import { Html, OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import {
  COMPONENTS_BY_STAGE,
  COMPONENT_BY_ID,
  DROP_Y,
  MOUNT_BY_ID,
  MOUNTS_BY_STAGE,
  trayPanelFor,
  trayScaleFor,
} from '../data/components'
import { STAGES } from '../data/stages'
import { useCurrentStage, useGameStore } from '../store/useGameStore'
import type { ComponentDef, Stage } from '../types'
import { ComponentVisual } from './ComponentModel'
import { MountZone } from './MountZone'
import { StageBoard } from './StageBoard'
import { StageCase } from './StageCase'
import { StagePeripherals } from './StagePeripherals'

const DROP_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DROP_Y)
const HIT = new THREE.Vector3()
const NDC = new THREE.Vector2()

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

function Bench({ stage }: { stage: Stage }) {
  const { width, depth, center } = stage.bench
  const grid = Math.max(width, depth)
  return (
    <group>
      <mesh position={[center[0], -0.16, center[1]]} receiveShadow>
        <boxGeometry args={[width, 0.32, depth]} />
        <meshStandardMaterial color="#252a33" metalness={0.2} roughness={0.85} />
      </mesh>
      <gridHelper
        args={[grid, Math.round(grid * 2), '#3b4453', '#2e3542']}
        position={[center[0], 0.004, center[1]]}
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
  const mounts = MOUNTS_BY_STAGE[STAGES[stageIndex].id]
  return (
    <>
      {mounts.map((mount) => {
        const componentId = placed[mount.id]
        if (!componentId) return null
        const def = COMPONENT_BY_ID[componentId]
        if (!def) return null
        return (
          <group key={mount.id} position={mount.position}>
            <ComponentVisual def={def} />
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
  const surfaceY = STAGES.find((s) => s.id === def.stage)?.tray.surfaceY ?? 0.11

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (useGameStore.getState().dragging) return
    event.stopPropagation()
    beginDrag(def.id, event.point.x, event.point.z)
  }

  return (
    <group
      position={[def.trayPos[0], surfaceY, def.trayPos[1]]}
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
        <ComponentVisual def={def} />
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
  const placedIds = new Set(Object.values(placed))
  const remaining = COMPONENTS_BY_STAGE[stage.id].filter((c) => !placedIds.has(c.id))
  return (
    <>
      {remaining.map((def) => (
        <TrayItem key={def.id} def={def} />
      ))}
    </>
  )
}

function DragGhost() {
  const dragging = useGameStore((s) => s.dragging)
  const selectedId = useGameStore((s) => s.selectedId)
  const dragPos = useGameStore((s) => s.dragPos)
  const hoverMountId = useGameStore((s) => s.hoverMountId)

  if (!dragging || !selectedId) return null
  const def = COMPONENT_BY_ID[selectedId]
  if (!def) return null

  const mount = hoverMountId ? MOUNT_BY_ID[hoverMountId] : null
  const position: [number, number, number] = mount
    ? [mount.position[0], mount.position[1] + 0.05, mount.position[2]]
    : [dragPos[0], DROP_Y + 0.08, dragPos[1]]

  return (
    <group position={position}>
      <ComponentVisual def={def} />
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 32]} />
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

function DragController() {
  const dragging = useGameStore((s) => s.dragging)
  const { camera, gl, raycaster } = useThree()

  useEffect(() => {
    if (!dragging) return
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      NDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      NDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(NDC, camera)
      const hit = raycaster.ray.intersectPlane(DROP_PLANE, HIT)
      if (hit) useGameStore.getState().updateDrag(hit.x, hit.z)
    }
    const onUp = () => useGameStore.getState().endDrag()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, camera, gl, raycaster])

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
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const { camera } = useThree()
  const desiredPos = useRef(new THREE.Vector3(...stage.camera.position))
  const desiredTarget = useRef(new THREE.Vector3(...stage.camera.target))
  const animating = useRef(false)

  useEffect(() => {
    desiredPos.current.set(...stage.camera.position)
    desiredTarget.current.set(...stage.camera.target)
    animating.current = true
  }, [stage.id, stage.camera.position, stage.camera.target])

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
  if (stage.id === 'board') return <StageBoard />
  if (stage.id === 'case') return <StageCase />
  return <StagePeripherals />
}

export function Scene() {
  const stage = useCurrentStage()
  return (
    <>
      <Lights />
      <Bench stage={stage} />
      <StageContent stage={stage} />
      <TrayPanel stage={stage} />
      <MountZones />
      <PlacedComponents />
      <Tray stage={stage} />
      <DragGhost />
      <DragController />
      <CameraRig stage={stage} />
    </>
  )
}
