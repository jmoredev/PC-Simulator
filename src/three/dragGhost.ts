import { MOUNT_BY_ID } from '../data/components'
import type { GameMode, Stage, Vec3 } from '../types'

/**
 * Cara superior del banco. Por debajo de ella el banco se interpone entre la
 * cámara y lo que se dibuje detrás, así que el fantasma del arrastre se acota
 * justo por encima (ver `ghostPosition`).
 */
export const BENCH_TOP = -0.172 + 0.32 / 2

/**
 * ¿Se pega el fantasma al hueco más cercano mientras se arrastra?
 *
 * Solo en práctica. En examen el imán delata la respuesta: de todos los huecos,
 * aquel al que se pega la pieza al acercarla es el correcto. El hueco candidato
 * se sigue calculando igual (`hoverMountId`), así que la colocación al soltar no
 * cambia; lo que cambia es que el fantasma no lo enseña.
 */
export function ghostSnaps(mode: GameMode, hoverMountId: string | null): boolean {
  return mode === 'practice' && hoverMountId !== null
}

/**
 * Dónde se dibuja el fantasma: en el hueco si el imán está activo, y si no en la
 * posición del puntero sobre el plano de la fase.
 *
 * En el plano vertical (chapa trasera) la Y libre se acota por encima del banco:
 * sin acotar, el banco se interpone entre la cámara y el fantasma y el cable
 * parece invisible mientras se arrastra por la mitad baja de la pantalla.
 */
export function ghostPosition(
  stage: Stage,
  dragPos: [number, number],
  mode: GameMode,
  hoverMountId: string | null,
  plug: boolean,
): Vec3 {
  const snap = ghostSnaps(mode, hoverMountId)
  const mount = snap && hoverMountId ? MOUNT_BY_ID[hoverMountId] : null

  if (mount) {
    return plug
      ? [mount.position[0], mount.position[1], mount.position[2]]
      : stage.drop.kind === 'vertical'
        ? [mount.position[0] - 0.12, mount.position[1], mount.position[2]]
        : [mount.position[0], mount.position[1] + 0.05, mount.position[2]]
  }
  if (stage.drop.kind === 'vertical') {
    const y = Math.max(dragPos[0], BENCH_TOP + 0.06)
    return plug ? [stage.drop.x, y, dragPos[1]] : [stage.drop.x - 0.12, y, dragPos[1]]
  }
  return [dragPos[0], stage.drop.y + 0.08, dragPos[1]]
}
