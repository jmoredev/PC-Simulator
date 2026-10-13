import {
  COMPONENT_BY_ID,
  COMPONENTS,
  IDENTIFY_LABEL,
  MOUNTS,
  MOUNT_BY_ID,
  TOTAL_STEPS,
  componentForMount,
} from '../data/components'
import { STAGES } from '../data/stages'
import { examScore, scoreColor, useGameStore } from '../store/useGameStore'
import type { StageId } from '../types'

/** Cómo se llama cada fase en el resumen, en palabras y no en identificadores. */
const STAGE_WORD: Record<StageId, string> = {
  identify: 'identificación',
  board: 'sobre la placa',
  ports: 'conectores',
  peripherals: 'periféricos',
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Nombre corto y divulgativo de una pieza, el mismo que usan los carteles. */
function pieceName(id: string): string {
  const def = COMPONENT_BY_ID[id]
  return def ? IDENTIFY_LABEL[def.kind] : id
}

export function FinishModal() {
  const mode = useGameStore((s) => s.mode)
  const errors = useGameStore((s) => s.errors)
  const forfeited = useGameStore((s) => s.forfeited)
  const placed = useGameStore((s) => s.placed)
  const startedAt = useGameStore((s) => s.startedAt)
  const finishedAt = useGameStore((s) => s.finishedAt)
  const attempts = useGameStore((s) => s.attempts)
  const misses = useGameStore((s) => s.misses)
  const unplaced = useGameStore((s) => s.unplaced)
  const reset = useGameStore((s) => s.reset)
  const backToMenu = useGameStore((s) => s.backToMenu)

  const elapsed = finishedAt ? finishedAt - startedAt : 0
  const isExam = mode === 'exam'
  const score = isExam ? examScore(errors, forfeited) : 100
  const accuracy = attempts > 0 ? Math.round((TOTAL_STEPS / attempts) * 100) : 100

  return (
    <div className="overlay">
      <div className="card">
        <h1>{isExam ? 'Examen terminado' : '¡Montaje completado!'}</h1>
        <p className="lead">
          {isExam
            ? `Has resuelto ${Object.keys(placed).length} de ${TOTAL_STEPS} colocaciones.` +
              (forfeited > 0 ? ' Has entregado alguna fase sin terminar.' : '')
            : `Has completado las ${STAGES.length} fases del montaje: ${TOTAL_STEPS} colocaciones con ${COMPONENTS.length} componentes en ${MOUNTS.length} sitios.`}
        </p>

        {isExam && (
          <div className="finish-score" style={{ color: scoreColor(score) }}>
            <div className="finish-score__num">{score}</div>
            <div className="finish-score__lbl">Puntuación sobre 100</div>
          </div>
        )}

        <div className="score-grid">
          {isExam ? (
            <>
              <div className="score-box">
                <div className="val">{errors}</div>
                <div className="lbl">Fallos</div>
              </div>
              <div className="score-box">
                <div className="val">{forfeited}</div>
                <div className="lbl">Sin colocar</div>
              </div>
            </>
          ) : (
            <div className="score-box">
              <div className="val" style={{ color: '#34d399' }}>
                100
              </div>
              <div className="lbl">Nota / 100</div>
            </div>
          )}
          <div className="score-box">
            <div className="val">{formatTime(elapsed)}</div>
            <div className="lbl">Tiempo</div>
          </div>
        </div>

        <p className="lead" style={{ marginBottom: 0 }}>
          Precisión: <b>{accuracy}%</b> ({attempts} intentos).{' '}
          {isExam
            ? 'Cada fallo y cada pieza sin colocar restan puntos.'
            : 'Practica de nuevo para bajar el tiempo.'}
        </p>

        {isExam && misses.length > 0 && (
          <section className="finish-review finish-review--misses">
            <h2>Qué falló</h2>
            <ul className="finish-review__list">
              {misses.map((miss, i) => {
                const mount = MOUNT_BY_ID[miss.mountId]
                const correct = mount ? componentForMount(mount) : undefined
                return (
                  <li key={`${miss.mountId}-${miss.componentId}-${i}`}>
                    Pusiste <b>«{pieceName(miss.componentId)}»</b> en{' '}
                    <b>«{mount?.label ?? 'otro sitio'}»</b> → ahí va{' '}
                    <b>«{correct ? IDENTIFY_LABEL[correct.kind] : 'otra pieza'}»</b>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {isExam && unplaced.length > 0 && (
          <section className="finish-review finish-review--unplaced">
            <h2>Te quedó por colocar</h2>
            <ul className="finish-review__list">
              {unplaced.map((item) => (
                <li key={`${item.stage}-${item.componentId}`}>
                  <b>{pieceName(item.componentId)}</b>{' '}
                  <span className="finish-review__where">({STAGE_WORD[item.stage]})</span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
