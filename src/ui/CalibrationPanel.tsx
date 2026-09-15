import { useState } from 'react'
import { BOARD_SLOTS, deriveLayout, type Point } from '../calibration'
import { useCalibrationStore } from '../store/useCalibrationStore'

export function CalibrationPanel() {
  const armed = useCalibrationStore((s) => s.armed)
  const points = useCalibrationStore((s) => s.points)
  const arm = useCalibrationStore((s) => s.arm)
  const clear = useCalibrationStore((s) => s.clear)
  const [boardId, setBoardId] = useState('z170-p')
  const [status, setStatus] = useState('')

  const layout = deriveLayout(points)
  const payload = { boardId, points, layout }

  const save = async () => {
    setStatus('Guardando…')
    try {
      const res = await fetch('/__calibration', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setStatus(data.ok ? `Guardado en ${data.file}` : `Error: ${data.error}`)
    } catch (error) {
      setStatus(`Error: ${String(error)}`)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setStatus('JSON copiado al portapapeles')
  }

  return (
    <div className="calib">
      <div className="calib__head">
        <h2>Modo calibración</h2>
        <p>
          Elige un hueco y marca los puntos sobre la placa. En las ranuras hay que
          marcar <b>los dos extremos</b>. La cámara se gira con el ratón.
        </p>
      </div>

      <label className="calib__field">
        <span>Modelo de placa (id)</span>
        <input value={boardId} onChange={(e) => setBoardId(e.target.value)} />
      </label>

      <div className="calib__slots">
        {BOARD_SLOTS.map((slot) => {
          const list: Point[] = points[slot.id] ?? []
          const done = list.length === slot.points
          const isArmed = armed === slot.id
          return (
            <button
              key={slot.id}
              className={`calib__slot${isArmed ? ' calib__slot--armed' : ''}${
                done ? ' calib__slot--done' : ''
              }`}
              onClick={() => arm(isArmed ? null : slot.id)}
              title={slot.hint}
            >
              <span className="calib__slot-label">{slot.label}</span>
              <span className="calib__slot-value">
                {isArmed
                  ? `clic ${list.length + 1}/${slot.points}…`
                  : done
                    ? list.map((p) => p.map((v) => v.toFixed(2)).join(',')).join('  ')
                    : list.length > 0
                      ? `${list.length}/${slot.points}`
                      : '—'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="calib__actions">
        <button className="btn" onClick={clear}>
          Borrar
        </button>
        <button className="btn" onClick={copy}>
          Copiar JSON
        </button>
        <button className="btn btn--accent" onClick={save}>
          Guardar en el proyecto
        </button>
      </div>

      {status && <div className="calib__status">{status}</div>}

      <pre className="calib__json">{JSON.stringify(payload, null, 2)}</pre>
    </div>
  )
}
