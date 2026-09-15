# Modelos 3D de los componentes

Coloca aquí los modelos 3D. El simulador funciona **sin ellos** (usa geometría
procedural), así que puedes ir añadiéndolos poco a poco.

## Cómo activarlos

1. Deja los archivos en esta carpeta (`public/assets/models/`).
2. Crea un archivo `.env` en la raíz del proyecto con:

   ```
   VITE_USE_MODELS=true
   ```

3. Reinicia `npm run dev`.

Si un archivo no existe o falla, ese componente concreto muestra su placeholder
y el resto sigue funcionando: **no hay que tocar código**.

## Nombres EXACTOS de los archivos

El nombre debe coincidir con el `id` del componente. Formato recomendado: `.glb`
(glTF binario, con las texturas incrustadas).

| Archivo            | Componente                 | Forma / notas                                                        |
| ------------------ | -------------------------- | -------------------------------------------------------------------- |
| `cpu.glb`          | CPU (procesador)           | Chip cuadrado con la tapa metálica (IHS). Base apoyada en el suelo.  |
| `cooler.glb`       | Disipador + ventilador     | Bloque de aletas con ventilador lateral.                             |
| `ram1.glb`         | Memoria RAM (módulo 1)     | Módulo rectangular y alargado con disipador.                         |
| `ram2.glb`         | Memoria RAM (módulo 2)     | Puede ser una copia de `ram1.glb`.                                   |
| `ssd.glb`          | SSD M.2                    | Placa alargada y fina, con chips y conector dorado en un extremo.    |
| `gpu.glb`          | Tarjeta gráfica            | Tarjeta alargada con 2 ventiladores y lengüetas PCIe doradas.        |
| `motherboard.glb`  | Placa base                 | **Solo la placa**, sin componentes. Se usa como base en la fase 1 y,  |
|                    |                            | con lo montado encima, como pieza de la fase 2.                      |
| `psu.glb`          | Fuente de alimentación     | Caja metálica rectangular con ventilador y rejilla.                  |
| `fan1.glb`         | Ventilador de caja         | Ventilador de 120 mm.                                                |
| `fan2.glb`         | Ventilador de caja         | Puede ser una copia de `fan1.glb`.                                   |
| `monitor.glb`      | Monitor                    | Pantalla con peana. Mírala de frente hacia +Z. Tamaño real (~53 cm). |
| `keyboard.glb`     | Teclado                    | Teclado plano apoyado en el suelo (~44 cm de ancho).                 |
| `mouse.glb`        | Ratón                      | Ratón pequeño (~12 cm).                                              |
| `speakers.glb`     | Altavoces                  | **Par** de altavoces (uno a cada lado).                              |

> Los periféricos son grandes de verdad (un monitor es más ancho que la placa
> base). Es correcto: así se ve la diferencia de escala al montarlos en la fase 3.

## Especificaciones recomendadas

- **Formato**: `.glb` (recomendado) o `.gltf` + carpeta de texturas (avisa para
  ajustar la ruta).
- **Escala**: indistinta. El simulador **centra y escala automáticamente** cada
  modelo para que su dimensión mayor ocupe el tamaño que le corresponde (por
  ejemplo, la GPU es más larga que la CPU). No hace falta ajustar nada a mano.
- **Orientación**: `Y` hacia arriba. La **base** del modelo (la cara que se
  apoya) debe quedar abajo.
- **Origen**: el punto `0,0,0` del modelo debe estar en la base y centrado en
  `X`/`Z`.
- **Polígonos**: menos de ~50.000 triángulos por pieza para que corra en
  portátiles del aula.
- **Texturas**: incrustadas en el `.glb` (PBR: color, normal, roughness).
  Formato de imagen JPG/PNG, 1024×1024 o 2048×2048.

## ¿De dónde saco los modelos?

Bancos con licencia libre (revisa siempre la licencia y cita al autor):

- Poly Pizza — https://poly.pizza
- Sketchfab (filtrar por *Downloadable* y licencia CC) — https://sketchfab.com
- Kenney Assets — https://kenney.nl/assets
- NASA / Smithsonian Open Access (hardware histórico)

Si prefieres, dime y busco yo las fuentes; tú solo tienes que descargarlas y
llamarlas como en la tabla.
