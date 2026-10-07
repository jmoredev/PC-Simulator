import { useEffect, useState } from 'react'
import { OPTIMIZED_MODELS } from '../data/boards'
import { TOTAL_STEPS } from '../data/components'
import { STAGES } from '../data/stages'
import { examScore, scoreColor, useGameStore } from '../store/useGameStore'

export function TopBar() {
  const mode = useGameStore((s) => s.mode)
  const placed = useGameStore((s) => s.placed)
  const errors = useGameStore((s) => s.errors)
  const forfeited = useGameStore((s) => s.forfeited)
  const startedAt = useGameStore((s) => s.startedAt)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const reset = useGameStore((s) => s.reset)
  const backToMenu = useGameStore((s) => s.backToMenu)
  const skipStage = useGameStore((s) => s.skipStage)
  const giveUp = useGameStore((s) => s.giveUp)

  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const done = Object.keys(placed).length
  const total = TOTAL_STEPS
  const pct = (done / total) * 100
  const score = mode === 'exam' ? examScore(errors, forfeited) : null
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const mm = Math.floor(seconds / 60)
  const ss = (seconds % 60).toString().padStart(2, '0')

  return (
    <div className="topbar">
      <div className="brand">
        <b>Montaje de PC</b>
        <span>Simulador interactivo 3D</span>
      </div>
      <span className={`badge badge--${mode === 'exam' ? 'exam' : 'practice'}`}>
        {mode === 'exam' ? 'Modo examen' : 'Modo práctica'}
      </span>
      <span className="badge badge--stage">
        {STAGES[Math.min(stageIndex, STAGES.length - 1)].short}
      </span>
      {OPTIMIZED_MODELS && (
        <span className="badge" style={{ color: '#fbbf24' }}>
          modelos comprimidos
        </span>
      )}

      <div className="spacer" />

      {mode === 'exam' && score !== null && (
        <span className="badge" style={{ color: scoreColor(score) }}>
          Puntos: {score}
        </span>
      )}
      <span className="badge">
        {mm}:{ss}
      </span>
      <div className="progress-wrap">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-label">
          {done}/{total}
        </span>
      </div>

      <button className="btn btn--ghost" onClick={reset}>
        Reiniciar
      </button>
      {mode === 'practice' && stageIndex < STAGES.length - 1 && (
        <button
          className="btn btn--ghost"
          onClick={skipStage}
          title="Pasar a la siguiente fase sin terminar esta"
        >
          Saltar fase →
        </button>
      )}
      {mode === 'exam' && (
        <button
          className="btn btn--ghost"
          onClick={giveUp}
          title="Rendirte de esta fase: pierdes los puntos de lo que falte y pasas a la siguiente"
        >
          Rendirse →
        </button>
      )}
      <button className="btn" onClick={backToMenu}>
        Menú
      </button>
    </div>
  )
}
