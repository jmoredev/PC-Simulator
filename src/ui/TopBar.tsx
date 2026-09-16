import { useEffect, useState } from 'react'
import { TOTAL_STEPS } from '../data/components'
import { STAGES } from '../data/stages'
import { useGameStore } from '../store/useGameStore'

export function TopBar() {
  const mode = useGameStore((s) => s.mode)
  const placed = useGameStore((s) => s.placed)
  const errors = useGameStore((s) => s.errors)
  const startedAt = useGameStore((s) => s.startedAt)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const reset = useGameStore((s) => s.reset)
  const backToMenu = useGameStore((s) => s.backToMenu)

  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const done = Object.keys(placed).length
  const total = TOTAL_STEPS
  const pct = (done / total) * 100
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const mm = Math.floor(seconds / 60)
  const ss = (seconds % 60).toString().padStart(2, '0')

  return (
    <div className="topbar">
      <div className="brand">
        <b>Montaje de PC</b>
        <span>Tecnología · 4º ESO</span>
      </div>
      <span className={`badge badge--${mode === 'exam' ? 'exam' : 'practice'}`}>
        {mode === 'exam' ? 'Modo examen' : 'Modo práctica'}
      </span>
      <span className="badge badge--stage">
        {STAGES[Math.min(stageIndex, STAGES.length - 1)].short}
      </span>

      <div className="spacer" />

      {mode === 'exam' && (
        <span className="badge" style={{ color: '#fca5a5' }}>
          Fallos: {errors}
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
      <button className="btn" onClick={backToMenu}>
        Menú
      </button>
    </div>
  )
}
