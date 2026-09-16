import { BOARD } from './boards'
import type { Stage, StageId, Vec3 } from '../types'

/**
 * El montaje se divide en tres fases, cada una con su propia escena: primero se
 * montan las piezas sobre la placa base, después se conectan los cables en la
 * parte trasera y, por último, se conectan los periféricos.
 */

/** Altura del plano de arrastre sobre el banco. */
const DROP_Y = 0.12

/** Vista de la fase 2: de frente a la chapa trasera, un poco por encima. */
function rearView(): { position: Vec3; target: Vec3 } {
  const rear = BOARD.rear
  if (!rear) {
    return { position: [-2.4, 0.8, 0], target: [-1, 0.2, 0] }
  }
  const [x, z] = rear.at
  const target: Vec3 = [x, rear.y, z]
  return {
    position: [x - 1.5, rear.y + 0.75, z],
    target,
  }
}

/** Cámara de la chapa trasera: la usan la fase 2 y el calibrador. */
export const REAR_CAMERA = rearView()

export const STAGES: Stage[] = [
  {
    id: 'board',
    index: 0,
    title: 'Sobre la placa base',
    short: '1. Placa base',
    hint: 'Monta la CPU, el disipador, la RAM, el SSD y la tarjeta gráfica.',
    bench: { width: 11, depth: 6.6, center: [0, 0.4] },
    tray: { cols: [-1.7, -0.5, 0.7], rows: [2.7, 3.6], surfaceY: 0.11 },
    camera: { position: [0.3, 4.8, 4.6], target: [0.15, 0.05, -0.4] },
    drop: { kind: 'horizontal', y: DROP_Y, wrongRadius: 0.9 },
  },
  {
    id: 'ports',
    index: 1,
    title: 'Parte trasera del PC',
    short: '2. Conectores',
    hint: 'Conecta cada cable con su puerto en la parte trasera del ordenador.',
    bench: { width: 11, depth: 7, center: [0, 0.6] },
    tray: { cols: [-1.9, -0.95, 0, 0.95, 1.9], rows: [2.4, 3.2], surfaceY: 0.11 },
    camera: REAR_CAMERA,
    drop: BOARD.rear
      ? { kind: 'vertical', x: BOARD.rear.at[0], wrongRadius: 0.22 }
      : { kind: 'horizontal', y: DROP_Y, wrongRadius: 0.9 },
  },
  {
    id: 'peripherals',
    index: 2,
    title: 'Periféricos',
    short: '3. Periféricos',
    hint: 'Conecta el monitor, el teclado, el ratón y los altavoces.',
    bench: { width: 17, depth: 13, center: [0, 0.2] as [number, number] },
    tray: { cols: [-1.9, 0.3], rows: [3.1, 4.7], surfaceY: 0.11 },
    camera: { position: [0.6, 9.2, 11.0], target: [0.4, 0.5, -0.1] },
    drop: { kind: 'horizontal', y: DROP_Y, wrongRadius: 0.9 },
  },
]

export const STAGE_BY_ID: Record<StageId, Stage> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
) as Record<StageId, Stage>
