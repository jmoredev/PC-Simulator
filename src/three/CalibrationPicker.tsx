import { useEffect } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BOARD_SLOTS, PORT_KINDS, type Point } from '../calibration'
import { useCalibrationStore } from '../store/useCalibrationStore'

const round = (v: number) => Math.round(v * 1000) / 1000

function Marker({ position, label, index }: { position: Point; label: string; index: number }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.11, 24]} />
        <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <Html center position={[0, 0.2, 0]} style={{ pointerEvents: 'none' }}>
        <div className="debug-label debug-label--marker">
          {label}
          {index > 0 ? ` (${index + 1})` : ''} · {position.map((v) => v.toFixed(2)).join(', ')}
        </div>
      </Html>
    </group>
  )
}

/** Captura el punto de la placa donde se hace clic y dibuja las marcas. */
export function CalibrationPicker() {
  const { camera, gl, scene } = useThree()
  const armed = useCalibrationStore((s) => s.armed)
  const points = useCalibrationStore((s) => s.points)
  const ports = useCalibrationStore((s) => s.ports)
  const setPoint = useCalibrationStore((s) => s.setPoint)

  useEffect(() => {
    if (!armed) return
    document.body.style.cursor = 'crosshair'

    const onClick = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(ndc, camera)
      const board = scene.getObjectByName('board')
      const hits = board ? raycaster.intersectObject(board, true) : []
      if (hits.length === 0) return
      const point = hits[0].point
      setPoint(armed, [round(point.x), round(point.y), round(point.z)])
    }

    gl.domElement.addEventListener('pointerdown', onClick)
    return () => {
      gl.domElement.removeEventListener('pointerdown', onClick)
      document.body.style.cursor = 'auto'
    }
  }, [armed, camera, gl, scene, setPoint])

  return (
    <>
      {Object.entries(points).flatMap(([id, list]) =>
        list.map((position, index) => (
          <Marker
            key={`${id}-${index}`}
            position={position}
            index={index}
            label={BOARD_SLOTS.find((s) => s.id === id)?.label ?? id}
          />
        )),
      )}
      {ports.map((port, index) => (
        <Marker
          key={`port-${index}`}
          position={port.point}
          index={0}
          label={PORT_KINDS.find((k) => k.kind === port.kind)?.label ?? port.kind}
        />
      ))}
    </>
  )
}
