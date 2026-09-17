import { COMPONENTS, MOUNTS, TOTAL_STEPS } from '../data/components'
import { STAGES } from '../data/stages'
import { useGameStore } from '../store/useGameStore'

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function FinishModal() {
  const mode = useGameStore((s) => s.mode)
  const errors = useGameStore((s) => s.errors)
  const startedAt = useGameStore((s) => s.startedAt)
  const finishedAt = useGameStore((s) => s.finishedAt)
  const attempts = useGameStore((s) => s.attempts)
  const reset = useGameStore((s) => s.reset)
  const backToMenu = useGameStore((s) => s.backToMenu)

  const elapsed = finishedAt ? finishedAt - startedAt : 0
  const score = mode === 'exam' ? Math.max(0, 100 - errors * 10) : 100
  const accuracy = attempts > 0 ? Math.round((TOTAL_STEPS / attempts) * 100) : 100

  return (
    <div className="overlay">
      <div className="card">
        <h1>{mode === 'exam' ? 'Examen terminado' : '¡Montaje completado!'}</h1>
        <p className="lead">
          Has completado las {STAGES.length} fases del montaje: {TOTAL_STEPS}{' '}
          colocaciones con {COMPONENTS.length} componentes en {MOUNTS.length} sitios.
        </p>

        <div className="score-grid">
          <div className="score-box">
            <div className="val" style={{ color: score >= 70 ? '#34d399' : '#f87171' }}>
              {score}
            </div>
            <div className="lbl">Nota / 100</div>
          </div>
          <div className="score-box">
            <div className="val">{errors}</div>
            <div className="lbl">Fallos</div>
          </div>
          <div className="score-box">
            <div className="val">{formatTime(elapsed)}</div>
            <div className="lbl">Tiempo</div>
          </div>
        </div>

        <p className="lead" style={{ marginBottom: 0 }}>
          Precisión: <b>{accuracy}%</b> ({attempts} intentos).{' '}
          {mode === 'exam'
            ? 'En el modo examen cada fallo resta 10 puntos.'
            : 'Practica de nuevo para bajar el tiempo.'}
        </p>

        <div className="overlay-actions">
          <button className="btn btn--ghost" onClick={backToMenu}>
            Menú
          </button>
          <button className="btn btn--accent" onClick={reset}>
            Montar otra vez
          </button>
        </div>
      </div>
    </div>
  )
}
