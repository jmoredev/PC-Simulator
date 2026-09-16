import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CALIBRATE } from './calibration'
import { useCurrentStage, useGameStore } from './store/useGameStore'
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

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const mode = useGameStore((s) => s.mode)
  const selectedId = useGameStore((s) => s.selectedId)
  const wrongFlash = useGameStore((s) => s.wrongFlash)
  const stage = useCurrentStage()
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
              <ComponentList onInspect={setInspectedId} />
              <InfoPanel inspectedId={inspectedId} selectedId={selectedId} mode={mode} />
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
