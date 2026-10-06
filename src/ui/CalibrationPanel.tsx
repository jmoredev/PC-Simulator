import { useState } from 'react'
import { BOARD_SLOTS, PORT_KINDS, PORT_SLOT, deriveLayout, type Point } from '../calibration'
import { BOARD_ID, BOARDS } from '../data/boards'
import { useCalibrationStore } from '../store/useCalibrationStore'
import { RotationCalibration } from './RotationCalibration'

export function CalibrationPanel() {
  const armed = useCalibrationStore((s) => s.armed)
  const points = useCalibrationStore((s) => s.points)
  const ports = useCalibrationStore((s) => s.ports)
  const portKind = useCalibrationStore((s) => s.portKind)
  const tab = useCalibrationStore((s) => s.tab)
  const setTab = useCalibrationStore((s) => s.setTab)
  const arm = useCalibrationStore((s) => s.arm)
  const setPortKind = useCalibrationStore((s) => s.setPortKind)
  const removeLastPort = useCalibrationStore((s) => s.removeLastPort)
  const clear = useCalibrationStore((s) => s.clear)
  const [status, setStatus] = useState('')

  const layout = deriveLayout(points, ports)
  const payload = { boardId: BOARD_ID, points, ports, layout }
  const markingPort = armed === PORT_SLOT

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
    const text = JSON.stringify(payload, null, 2)
    try {
      // En http (el aula con la IP de la LAN) navigator.clipboard no existe.
      if (!navigator.clipboard) throw new Error('portapapeles no disponible')
      await navigator.clipboard.writeText(text)
      setStatus('JSON copiado al portapapeles')
    } catch {
      setStatus('No se pudo copiar: el JSON de abajo se puede seleccionar a mano')
    }
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

      <div className="calib__tabs">
        <button
          className={`calib__tab${tab === 'positions' ? ' calib__tab--active' : ''}`}
          onClick={() => setTab('positions')}
        >
          Posiciones
        </button>
        <button
          className={`calib__tab${tab === 'rotations' ? ' calib__tab--active' : ''}`}
          onClick={() => setTab('rotations')}
        >
          Rotaciones
        </button>
      </div>

      {tab === 'rotations' ? (
        <RotationCalibration />
      ) : (
        <>
      <label className="calib__field">
        <span>Modelo de placa</span>
        <select
          value={BOARD_ID}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search)
            params.set('board', e.target.value)
            window.location.search = params.toString()
          }}
        >
          {BOARDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.id}
            </option>
          ))}
        </select>
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

      <div className="calib__ports">
        <div className="calib__ports-head">
          <span>Puertos traseros</span>
          <span className="calib__ports-count">{ports.length}</span>
        </div>
        <div className="calib__ports-add">
          <select value={portKind} onChange={(e) => setPortKind(e.target.value as typeof portKind)}>
            {PORT_KINDS.map((p) => (
              <option key={p.kind} value={p.kind}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            className={`calib__slot${markingPort ? ' calib__slot--armed' : ''}`}
            onClick={() => arm(markingPort ? null : PORT_SLOT)}
          >
            {markingPort ? 'Haz clic en el puerto…' : 'Marcar puerto'}
          </button>
        </div>
        {ports.length > 0 && (
          <ul className="calib__ports-list">
            {ports.map((p, i) => (
              <li key={`${p.kind}-${i}`}>
                <b>{PORT_KINDS.find((k) => k.kind === p.kind)?.label ?? p.kind}</b>
                <span>{p.point.map((v) => v.toFixed(2)).join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
        {ports.length > 0 && (
          <button className="btn btn--ghost" onClick={removeLastPort}>
            Borrar el último puerto
          </button>
        )}
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
        </>
      )}
    </div>
  )
}
