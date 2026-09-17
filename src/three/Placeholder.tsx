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
    case 'monitor':
      return <MonitorShape accent={def.color} />
    case 'keyboard':
      return <KeyboardShape accent={def.color} />
    case 'mouse':
      return <MouseShape accent={def.color} />
    case 'speaker':
      return <SpeakersShape accent={def.color} />
    case 'audio-out':
    case 'audio-in':
    case 'audio-mic':
      return <JackShape accent={def.color} />
    default:
      return <CableShape kind={def.kind} accent={def.color} />
  }
}

/** Anchura del conector (cara que se clava en el puerto). */
const CABLE_WIDTH: Record<string, number> = {
  ps2: 0.32,
  usb: 0.36,
  'usb-c': 0.3,
  lan: 0.36,
  rj11: 0.28,
  hdmi: 0.38,
  displayport: 0.34,
  dvi: 0.4,
  vga: 0.42,
}

/** Conector de cable: carcasa, cara de color y latiguillo. */
function CableShape({ kind, accent }: { kind: string; accent: string }) {
  const w = CABLE_WIDTH[kind] ?? 0.3
  const h = 0.18
  const d = 0.17
  return (
    <group>
      <Box s={[w, h, d]} p={[0, h / 2, 0]} c="#2b323d" m={0.3} r={0.5} />
      <Box s={[w * 0.72, 0.025, d * 0.72]} p={[0, h + 0.012, 0]} c={accent} m={0.45} r={0.45} />
      <Cyl
        rt={0.035}
        rb={0.035}
        h={0.26}
        p={[0, h / 2, d / 2 + 0.13]}
        rot={[Math.PI / 2, 0, 0]}
        c="#111722"
        r={0.6}
      />
    </group>
  )
}

/** Clavija de audio de 3,5 mm (jack). */
function JackShape({ accent }: { accent: string }) {
  return (
    <group>
      <Cyl rt={0.075} rb={0.075} h={0.1} p={[0, 0.05, 0]} c="#cbd5e1" m={0.8} r={0.3} />
      <Cyl rt={0.055} rb={0.055} h={0.08} p={[0, 0.14, 0]} c={accent} m={0.6} r={0.4} />
      <Cyl rt={0.022} rb={0.022} h={0.14} p={[0, 0.25, 0]} c="#94a3b8" m={0.9} r={0.3} />
      <Cyl
        rt={0.032}
        rb={0.032}
        h={0.26}
        p={[0, 0.05, 0.18]}
        rot={[Math.PI / 2, 0, 0]}
        c="#111722"
        r={0.6}
      />
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
      <Box s={[1.33, 0.05, 0.5]} p={[0, 0.025, 0]} c={accent} r={0.6} />
      <Box s={[1.28, 0.02, 0.08]} p={[0, 0.05, -0.21]} c="#d9b44a" m={0.95} r={0.3} />
      <Box s={[0.5, 0.02, 0.1]} p={[-0.05, 0.06, 0.2]} c="#3a3f47" m={0.5} r={0.5} />
      <Box s={[0.16, 0.02, 0.08]} p={[0.6, 0.05, 0.2]} c="#e6e9ee" m={0.6} r={0.4} />
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
