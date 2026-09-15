import type { Stage, StageId } from '../types'

/**
 * El montaje se divide en tres fases independientes, cada una con su propia
 * escena: primero se montan las piezas sobre la placa base, después se instala
 * todo dentro de la caja y, por último, se conectan los periféricos.
 */
export const STAGES: Stage[] = [
  {
    id: 'board',
    index: 0,
    title: 'Sobre la placa base',
    short: '1. Placa base',
    hint: 'Monta la CPU, el disipador, la RAM, el SSD y la tarjeta gráfica.',
    bench: { width: 11, depth: 6.6, center: [0, 0.4] },
    tray: { cols: [-1.7, -0.5, 0.7], rows: [2.7, 3.6], surfaceY: 0.11 },
    camera: { position: [0, 6.0, 6.2], target: [0, 0, 0.9] },
  },
  {
    id: 'case',
    index: 1,
    title: 'Dentro de la caja',
    short: '2. Caja',
    hint: 'Instala la placa ya montada, la fuente de alimentación y los ventiladores.',
    bench: { width: 13, depth: 11, center: [0, 0.6] },
    tray: { cols: [-1.6, 0.2], rows: [3.4, 4.6], surfaceY: 0.11 },
    camera: { position: [0.2, 8.4, 8.6], target: [0, 0.2, 1.0] },
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
  },
]

export const STAGE_BY_ID: Record<StageId, Stage> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
) as Record<StageId, Stage>
