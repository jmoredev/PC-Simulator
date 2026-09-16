import { useState } from 'react'

const STORAGE_KEY = 'pc-sim-help'

const CONTROLS: [string, string][] = [
  ['Arrastrar y soltar', 'Coge una pieza de la bandeja y llévala hasta su hueco.'],
  ['Clic y clic', 'Haz clic en una pieza y después en la zona iluminada (modo práctica).'],
  ['Girar la cámara', 'Mantén pulsado el botón izquierdo del ratón y arrastra.'],
  ['Acercar o alejar', 'Gira la rueda del ratón para ver los detalles.'],
  ['Cancelar', 'Pulsa Esc si quieres soltar la pieza que llevas.'],
]

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'hidden'
  } catch {
    return true
  }
}

/** Leyenda de controles. Se puede ocultar y queda recordada desde la `?`. */
export function ControlsHelp() {
  const [open, setOpen] = useState(readOpen)

  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'open' : 'hidden')
    } catch {
      // sin persistencia disponible
    }
  }

  return (
    <div className="help">
      {open && (
        <div className="help__card">
          <h2>Controles</h2>
          <ul className="help__list">
            {CONTROLS.map(([name, text]) => (
              <li key={name}>
                <b>{name}</b>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        className="help__toggle"
        onClick={toggle}
        title={open ? 'Ocultar los controles' : 'Ver los controles'}
        aria-label={open ? 'Ocultar los controles' : 'Ver los controles'}
      >
        {open ? '×' : '?'}
      </button>
    </div>
  )
}
