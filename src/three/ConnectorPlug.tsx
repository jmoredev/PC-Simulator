import type { ComponentDef } from '../types'
import { Box, Cyl } from './primitives'

/**
 * Cable enchufado en un puerto de la parte trasera: un conector simple metido
 * en el puerto y un latiguillo que sale hacia fuera y cae. Se usa en lugar de
 * la imagen PNG, que queda plana sobre la chapa.
 */
export function ConnectorPlug({
  def,
  size,
}: {
  def: ComponentDef
  /** [largo, alto] del puerto, en unidades. */
  size: [number, number]
}) {
  const [along, across] = size
  const depth = 0.06
  const body = Math.max(along, across)

  return (
    <group>
      {/* Cuerpo del conector, metido en el puerto y asomando hacia la cámara */}
      <Box
        s={[depth, across * 1.15, along * 1.15]}
        p={[-depth / 2, 0, 0]}
        c="#2b323d"
        m={0.3}
        r={0.5}
      />
      {/* Cara de color del conector */}
      <Box
        s={[0.012, across * 0.8, along * 0.8]}
        p={[-depth - 0.006, 0, 0]}
        c={def.color}
        m={0.4}
        r={0.4}
      />
      {/* Latiguillo: sale hacia fuera y cae en diagonal */}
      <Cyl
        rt={body * 0.16}
        rb={body * 0.16}
        h={body * 1.9}
        p={[-depth - body * 0.75, -body * 0.5, 0]}
        rot={[0, 0, (Math.PI * 2) / 3]}
        c="#111722"
        m={0.2}
        r={0.7}
      />
    </group>
  )
}
