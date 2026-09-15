import type { Vec3 } from '../types'

interface BoxProps {
  s: Vec3
  p?: Vec3
  rot?: Vec3
  c: string
  m?: number
  r?: number
  emissive?: string
  emissiveIntensity?: number
}

export function Box({
  s,
  p = [0, 0, 0],
  rot = [0, 0, 0],
  c,
  m = 0.35,
  r = 0.5,
  emissive = '#000000',
  emissiveIntensity = 0,
}: BoxProps) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        metalness={m}
        roughness={r}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  )
}

interface CylProps {
  rt?: number
  rb?: number
  h: number
  seg?: number
  p?: Vec3
  rot?: Vec3
  c: string
  m?: number
  r?: number
  emissive?: string
  emissiveIntensity?: number
}

export function Cyl({
  rt,
  rb,
  h,
  seg = 24,
  p = [0, 0, 0],
  rot = [0, 0, 0],
  c,
  m = 0.35,
  r = 0.5,
  emissive = '#000000',
  emissiveIntensity = 0,
}: CylProps) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[rt ?? rb ?? 0.1, rb ?? rt ?? 0.1, h, seg]} />
      <meshStandardMaterial
        color={c}
        metalness={m}
        roughness={r}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  )
}

interface SphereProps {
  radius: number
  scale?: Vec3
  p?: Vec3
  c: string
  m?: number
  r?: number
}

export function Ball({ radius, scale = [1, 1, 1], p = [0, 0, 0], c, m = 0.35, r = 0.5 }: SphereProps) {
  return (
    <mesh position={p} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshStandardMaterial color={c} metalness={m} roughness={r} />
    </mesh>
  )
}
