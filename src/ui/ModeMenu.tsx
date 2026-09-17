import { STAGES } from '../data/stages'
import { useGameStore } from '../store/useGameStore'
import type { GameMode } from '../types'

const STEPS: [string, string][] = [
  ['1', 'Primero identifica cada pieza y llévala a su cartel.'],
  ['2', 'Después móntala en la placa, la caja o la mesa.'],
  ['3', 'Si encaja, se coloca solo. Si no, vuelve a su sitio.'],
  ['4', 'También puedes hacer clic en una pieza y luego en su hueco.'],
]

export function ModeMenu() {
  const start = useGameStore((s) => s.start)

  const pick = (mode: GameMode) => () => start(mode)

  return (
    <div className="overlay">
      <div className="card">
        <h1>Simulador de montaje de PC</h1>
        <p className="lead">
          Vas a montar un ordenador como lo haría un técnico, en <b>4 fases</b>:
          primero identificarás las piezas, después las montarás sobre la placa,
          luego conectarás los cables en la parte trasera y por último los
          periféricos. Elige cómo quieres practicar.
        </p>

        <div className="phase-strip">
          {STAGES.map((stage) => (
            <div className="phase-chip" key={stage.id}>
              <b>{stage.index + 1}</b>
              <span>{stage.title}</span>
            </div>
          ))}
        </div>

        <div className="mode-grid">
          <button className="mode-card" onClick={pick('practice')}>
            <span className="mode-tag mode-tag--practice">CON AYUDA</span>
            <h3>Modo práctica</h3>
            <p>
              Cuando cojas una pieza se ilumina el hueco donde va y verás su nombre.
              Ideal para aprender el montaje por primera vez.
            </p>
          </button>
          <button className="mode-card" onClick={pick('exam')}>
            <span className="mode-tag mode-tag--exam">SIN AYUDA</span>
            <h3>Modo examen</h3>
            <p>
              Sin pistas ni zonas iluminadas. Se cuentan los fallos y al terminar
              obtienes una nota sobre 100. Demuestra lo que has aprendido.
            </p>
          </button>
        </div>

        <div className="steps">
          {STEPS.map(([n, text]) => (
            <div className="step" key={n}>
              <b>{n}</b>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
