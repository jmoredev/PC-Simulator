import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COMPONENT_BY_ID } from '../data/components'
import { useGameStore } from '../store/useGameStore'
import type { MountPoint } from '../types'

interface Props {
  mount: MountPoint
}

/** Zona resaltable de un punto de montaje. */
export function MountZone({ mount }: Props) {
  const mode = useGameStore((s) => s.mode)
  const selectedId = useGameStore((s) => s.selectedId)
  const hoverMountId = useGameStore((s) => s.hoverMountId)
  const wrongFlash = useGameStore((s) => s.wrongFlash)
  const placed = useGameStore((s) => s.placed)
  const placeInto = useGameStore((s) => s.placeInto)
  const group = useRef<THREE.Group>(null)

  const def = selectedId ? COMPONENT_BY_ID[selectedId] : null
  const isCandidate = !!def && !placed[mount.id] && mount.accepts.includes(def.kind)
  const isHover = hoverMountId === mount.id
  const isWrong = wrongFlash === mount.id

  const showInPractice = mode === 'practice' && isCandidate
  const visible = isWrong || showInPractice

  const color = isWrong ? '#ef4444' : isHover ? '#22c55e' : '#34d399'
  const [w, d] = mount.size

  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = 0.55 + 0.3 * Math.sin(clock.elapsedTime * (isHover ? 8 : 4))
    group.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined
      if (!mat) return
      const base = child.userData.baseOpacity as number | undefined
      if (base !== undefined) mat.opacity = base * (isHover ? 1 : pulse)
    })
    const targetScale = isHover ? 1.04 : 1
    group.current.scale.lerp(
      new THREE.Vector3(targetScale, 1, targetScale),
      0.2,
    )
  })

  if (!visible) return null

  return (
    <group
      ref={group}
      position={[mount.position[0], mount.position[1] + 0.006, mount.position[2]]}
      rotation={[-Math.PI / 2, 0, -(mount.angle ?? 0)]}
      onPointerDown={(event) => {
        if (!showInPractice || !isCandidate) return
        event.stopPropagation()
        placeInto(mount.id)
      }}
      onPointerOver={(event) => {
        if (!showInPractice) return
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh userData={{ baseOpacity: isHover ? 0.85 : 0.6 }}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.002]} userData={{ baseOpacity: isHover ? 0.4 : 0.22 }}>
        <planeGeometry args={[w * 0.86, d * 0.86]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {mode === 'practice' && (
        <Html
          center
          position={[0, 0, Math.min(d * 0.5 + 0.18, 0.6)]}
          style={{ pointerEvents: 'none' }}
        >
          <div className={`mount-label${isHover ? ' mount-label--active' : ''}`}>
            {mount.label}
          </div>
        </Html>
      )}
    </group>
  )
}
