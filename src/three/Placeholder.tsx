import { useMemo } from 'react'
import type { ComponentDef } from '../types'
import { Ball, Box, Cyl } from './primitives'

/**
 * Geometría procedural de sustitución. Se usa automáticamente mientras no
 * exista el modelo .glb del componente, de modo que el simulador funciona
 * sin ningún asset externo.
 */
export function Placeholder({ def }: { def: ComponentDef }) {
  switch (def.kind) {
    case 'motherboard':
      return <MotherboardShape />
    case 'cpu':
      return <CpuShape accent={def.color} />
    case 'cooler':
      return <CoolerShape accent={def.color} />
    case 'ram':
      return <RamShape accent={def.color} />
    case 'ssd':
      return <SsdShape accent={def.color} />
    case 'gpu':
      return <GpuShape accent={def.color} />
    case 'psu':
      return <PsuShape accent={def.color} />
    case 'fan':
      return <FanShape accent={def.color} />
    case 'monitor':
      return <MonitorShape accent={def.color} />
    case 'keyboard':
      return <KeyboardShape accent={def.color} />
    case 'mouse':
      return <MouseShape accent={def.color} />
    case 'speaker':
      return <SpeakersShape accent={def.color} />
    default:
      return <Box s={[0.5, 0.5, 0.5]} p={[0, 0.25, 0]} c={def.color} />
  }
}

function MotherboardShape() {
  return (
    <group>
      <Box s={[3.05, 0.16, 2.44]} p={[0, -0.08, 0]} c="#14532d" r={0.75} />
      <Box s={[3.05, 0.02, 2.44]} p={[0, 0.005, 0]} c="#166534" r={0.7} />
      <Box s={[0.9, 0.03, 0.7]} p={[0.85, 0.03, -0.85]} c="#1f2937" r={0.5} />
      <Box s={[0.7, 0.02, 0.5]} p={[-1.1, 0.02, -0.9]} c="#1f2937" r={0.5} />
      <Box s={[0.5, 0.01, 0.5]} p={[0.2, 0.02, 0.9]} c="#111827" r={0.4} />
    </group>
  )
}

function CpuShape({ accent }: { accent: string }) {
  return (
    <group>
      <Box s={[0.5, 0.02, 0.5]} p={[0, 0.01, 0]} c="#1a7f4b" r={0.6} />
      <Box s={[0.5, 0.06, 0.5]} p={[0, 0.05, 0]} c={accent} m={0.95} r={0.2} />
      <Box s={[0.4, 0.03, 0.4]} p={[0, 0.09, 0]} c="#eef1f5" m={0.9} r={0.15} />
    </group>
  )
}

function CoolerShape({ accent }: { accent: string }) {
  const fins = useMemo(() => Array.from({ length: 12 }, (_, i) => -0.42 + i * 0.076), [])
  return (
    <group>
      <Box s={[0.54, 0.08, 0.54]} p={[0, 0.04, 0]} c={accent} m={0.9} r={0.25} />
      <Box s={[0.46, 0.06, 0.42]} p={[0, 0.08, 0]} c="#7f8a99" m={0.9} r={0.3} />
      {fins.map((x, i) => (
        <Box key={i} s={[0.012, 0.9, 0.4]} p={[x, 0.56, 0]} c="#c3cbd6" m={0.85} r={0.35} />
      ))}
      <Cyl
        rt={0.17}
        rb={0.17}
        h={0.1}
        p={[0.3, 0.56, 0]}
        rot={[0, 0, Math.PI / 2]}
        c="#22252a"
        r={0.6}
      />
      <Cyl
        rt={0.15}
        rb={0.15}
        h={0.04}
        p={[0.35, 0.56, 0]}
        rot={[0, 0, Math.PI / 2]}
        c={accent}
        m={0.4}
      />
    </group>
  )
}

function RamShape({ accent }: { accent: string }) {
  return (
    <group>
      <Box s={[0.07, 0.5, 1.33]} p={[0, 0.25, 0]} c={accent} r={0.6} />
      <Box s={[0.1, 0.05, 1.28]} p={[0, 0.03, 0]} c="#d9b44a" m={0.95} r={0.3} />
      <Box s={[0.1, 0.1, 0.5]} p={[0, 0.45, -0.05]} c="#3a3f47" m={0.5} r={0.5} />
      <Box s={[0.08, 0.06, 0.16]} p={[0, 0.4, 0.6]} c="#e6e9ee" m={0.6} r={0.4} />
    </group>
  )
}

function SsdShape({ accent }: { accent: string }) {
  return (
    <group>
      <Box s={[0.9, 0.03, 0.22]} p={[0, 0.015, 0]} c={accent} r={0.7} />
      <Box s={[0.42, 0.02, 0.16]} p={[-0.12, 0.04, 0]} c="#0f1216" r={0.5} />
      <Box s={[0.16, 0.02, 0.14]} p={[0.14, 0.04, 0]} c="#1c2128" r={0.5} />
      <Box s={[0.08, 0.02, 0.16]} p={[0.42, 0.03, 0]} c="#d9b44a" m={0.95} r={0.3} />
    </group>
  )
}

function GpuShape({ accent }: { accent: string }) {
  return (
    <group>
      <Box s={[2.3, 0.16, 0.46]} p={[0, 0.86, 0]} c={accent} m={0.6} r={0.4} />
      <Box s={[2.3, 0.42, 0.3]} p={[0, 0.56, -0.05]} c="#3f4650" m={0.55} r={0.45} />
      <Box s={[2.3, 0.14, 0.42]} p={[0, 0.16, 0]} c="#515966" r={0.5} />
      <Cyl
        rt={0.28}
        rb={0.28}
        h={0.07}
        p={[-0.6, 0.56, 0.17]}
        rot={[Math.PI / 2, 0, 0]}
        c="#1c2027"
      />
      <Cyl
        rt={0.28}
        rb={0.28}
        h={0.07}
        p={[0.6, 0.56, 0.17]}
        rot={[Math.PI / 2, 0, 0]}
        c="#1c2027"
      />
      <Cyl
        rt={0.09}
        rb={0.09}
        h={0.09}
        p={[-0.6, 0.56, 0.19]}
        rot={[Math.PI / 2, 0, 0]}
        c={accent}
        m={0.7}
      />
      <Cyl
        rt={0.09}
        rb={0.09}
        h={0.09}
        p={[0.6, 0.56, 0.19]}
        rot={[Math.PI / 2, 0, 0]}
        c={accent}
        m={0.7}
      />
      <Box s={[2.3, 0.1, 0.1]} p={[0, 0.05, 0.08]} c="#e0bd55" m={0.95} r={0.3} />
    </group>
  )
}

function PsuShape({ accent }: { accent: string }) {
  return (
    <group>
      <Box s={[1.5, 0.86, 1.6]} p={[0, 0.43, 0]} c={accent} m={0.6} r={0.4} />
      <Cyl rt={0.62} rb={0.62} h={0.05} p={[0, 0.88, 0]} c="#15171a" r={0.6} />
      <Box s={[0.9, 0.02, 0.9]} p={[0, 0.9, 0]} c="#0d0f12" r={0.4} />
      <Box s={[1.5, 0.12, 0.28]} p={[0, 0.55, -0.72]} c="#15171a" r={0.5} />
      <Box s={[0.1, 0.1, 0.1]} p={[0, 0.5, 0.81]} c="#d9b44a" m={0.9} r={0.3} />
    </group>
  )
}

function FanShape({ accent }: { accent: string }) {
  const blades = useMemo(() => Array.from({ length: 7 }, (_, i) => (i * Math.PI * 2) / 7), [])
  return (
    <group>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.5, 0.08, 8, 28]} />
        <meshStandardMaterial color={accent} metalness={0.4} roughness={0.5} />
      </mesh>
      {[
        [-0.5, -0.5],
        [0.5, -0.5],
        [-0.5, 0.5],
        [0.5, 0.5],
      ].map(([x, z], i) => (
        <Box key={i} s={[0.16, 0.22, 0.16]} p={[x, 0.11, z]} c={accent} r={0.6} />
      ))}
      {blades.map((a, i) => (
        <Box
          key={i}
          s={[0.34, 0.02, 0.12]}
          p={[Math.cos(a) * 0.32, 0.13, Math.sin(a) * 0.32]}
          rot={[0, -a, 0.25]}
          c="#3b414a"
          r={0.5}
        />
      ))}
      <Cyl rt={0.14} rb={0.14} h={0.26} p={[0, 0.13, 0]} c="#0f1114" r={0.5} />
      <Cyl rt={0.05} rb={0.05} h={0.28} p={[0, 0.15, 0]} c={accent} m={0.6} />
    </group>
  )
}

function MonitorShape({ accent }: { accent: string }) {
  return (
    <group>
      <Box s={[1.7, 0.08, 0.85]} p={[0, 0.04, 0]} c="#3a404a" r={0.5} />
      <Box s={[0.18, 0.9, 0.18]} p={[0, 0.5, -0.08]} c="#3a404a" r={0.5} />
      <Box s={[4.6, 2.6, 0.16]} p={[0, 2.23, 0]} c={accent} m={0.4} r={0.4} />
      <Box
        s={[4.34, 2.34, 0.05]}
        p={[0, 2.23, 0.09]}
        c="#1d3a4d"
        emissive="#2b6f8f"
        emissiveIntensity={0.7}
        r={0.3}
      />
    </group>
  )
}

function KeyboardShape({ accent }: { accent: string }) {
  const keys = useMemo(() => {
    const list: [number, number][] = []
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 15; c++) {
        list.push([-1.72 + c * 0.245, -0.42 + r * 0.215])
      }
    }
    return list
  }, [])
  return (
    <group>
      <Box s={[3.8, 0.12, 1.35]} p={[0, 0.06, 0]} c={accent} r={0.6} />
      {keys.map(([x, z], i) => (
        <Box key={i} s={[0.2, 0.04, 0.18]} p={[x, 0.14, z]} c="#6d7684" r={0.4} />
      ))}
      <Box s={[1.25, 0.04, 0.18]} p={[0.35, 0.14, 0.65]} c="#6d7684" r={0.4} />
    </group>
  )
}

function MouseShape({ accent }: { accent: string }) {
  return (
    <group>
      <Ball radius={1} scale={[0.3, 0.2, 0.6]} p={[0, 0.2, 0]} c={accent} r={0.45} />
      <Box s={[0.03, 0.08, 0.55]} p={[0, 0.38, 0.05]} c="#1c2027" r={0.4} />
    </group>
  )
}

function SpeakersShape({ accent }: { accent: string }) {
  return (
    <group>
      {[-0.52, 0.52].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <Box s={[0.88, 1.5, 0.75]} p={[0, 0.75, 0]} c={accent} r={0.55} />
          <Cyl
            rt={0.23}
            rb={0.23}
            h={0.04}
            p={[0, 0.55, 0.39]}
            rot={[Math.PI / 2, 0, 0]}
            c="#1c2027"
          />
          <Cyl
            rt={0.11}
            rb={0.11}
            h={0.04}
            p={[0, 1.15, 0.39]}
            rot={[Math.PI / 2, 0, 0]}
            c="#1c2027"
          />
        </group>
      ))}
    </group>
  )
}
