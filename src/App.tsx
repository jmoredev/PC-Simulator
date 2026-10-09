import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CALIBRATE } from './calibration'
import { useCurrentStage, useGameStore } from './store/useGameStore'
import type { GameMode } from './types'
import { Scene } from './three/Scene'
import { CalibrationPanel } from './ui/CalibrationPanel'
import { ComponentList } from './ui/ComponentList'
import { ConnectorBar } from './ui/ConnectorBar'
import { ControlsHelp } from './ui/ControlsHelp'
import { FinishModal } from './ui/FinishModal'
import { InfoPanel } from './ui/InfoPanel'
import { ModeMenu } from './ui/ModeMenu'
import { StageBanner } from './ui/StageBanner'
import { StatusBar } from './ui/StatusBar'
import { TopBar } from './ui/TopBar'

/**
 * Paneles laterales con su estado de plegado. `App` lo monta con
 * `key={startedAt}`, así que al empezar una partida nueva se vuelve a montar y
 * recupera el reparto por defecto: la lista plegada y la ficha abierta. Sin la
 * clave, el estado se arrastraría de una partida a la siguiente, porque este
 * componente no se desmonta al pasar por el menú.
 */
function SidePanels({
  onInspect,
  inspectedId,
  selectedId,
  mode,
}: {
  onInspect: (id: string | null) => void
  inspectedId: string | null
  selectedId: string | null
  mode: GameMode
}) {
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(true)
  return (
    <>
      <ComponentList
        onInspect={onInspect}
        open={leftOpen}
        onToggle={() => setLeftOpen((v) => !v)}
      />
      <InfoPanel
        inspectedId={inspectedId}
        selectedId={selectedId}
        mode={mode}
        open={rightOpen}
        onToggle={() => setRightOpen((v) => !v)}
      />
    </>
  )
}

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const mode = useGameStore((s) => s.mode)
  const selectedId = useGameStore((s) => s.selectedId)
  const wrongFlash = useGameStore((s) => s.wrongFlash)
  const stage = useCurrentStage()
  /** Momento en que empezó la partida: cambia con «Reiniciar» y con una nueva. */
  const startedAt = useGameStore((s) => s.startedAt)
  const [inspectedId, setInspectedId] = useState<string | null>(null)
  /** En la fase de conectores los cables salen de una barra inferior. */
  const cableBar = phase === 'building' && stage.id === 'ports'

  useEffect(() => {
    if (!wrongFlash) return
    const id = window.setTimeout(() => useGameStore.getState().clearWrongFlash(), 1600)
    return () => window.clearTimeout(id)
  }, [wrongFlash])

  return (
    <div className="app">
      <div className="canvas-host">
        <Canvas
          shadows="percentage"
          dpr={[1, 2]}
          camera={{ position: [0, 6.2, 8.4], fov: 45 }}
        >
          <color attach="background" args={['#0b0f16']} />
          <fog attach="fog" args={['#0b0f16', 20, 42]} />
          <Scene />
        </Canvas>
      </div>

      {CALIBRATE ? (
        <CalibrationPanel />
      ) : (
        <>
          {phase !== 'menu' && (
            <>
              <TopBar />
              {/*
                En examen no se muestran los paneles: la lista de fases es el
                nombre de cada pieza y la ficha es la explicación, así que los
                dos son la respuesta. El examen se juega arrastrando las piezas
                de la mesa (no hay «clic y clic», que necesita la lista).
              */}
              {mode === 'practice' && (
                <SidePanels
                  key={startedAt}
                  onInspect={setInspectedId}
                  inspectedId={inspectedId}
                  selectedId={selectedId}
                  mode={mode}
                />
              )}
              <StatusBar raised={cableBar} />
              {cableBar && <ConnectorBar />}
              <StageBanner />
              {phase === 'building' && <ControlsHelp />}
            </>
          )}

          {phase === 'menu' && <ModeMenu />}
          {phase === 'finished' && <FinishModal />}
        </>
      )}
    </div>
  )
}
