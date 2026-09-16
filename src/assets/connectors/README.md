# Imágenes de los conectores (fase 2)

Aqui van las imágenes **PNG** de los conectores de la parte trasera. Se dibujan
tumbadas sobre el panel, así que el archivo debe ser el conector **visto de
frente**, recortado al ras y con el fondo transparente.

## Cómo se llaman

El nombre debe ser el `kind` del conector. Estos son los que se usan:

| Archivo            | Conector                     |
| ------------------ | ---------------------------- |
| `ps2.png`          | PS/2 (teclado/ratón)         |
| `usb.png`          | USB-A                        |
| `lan.png`          | RJ-45 (red)                  |
| `hdmi.png`         | HDMI                         |
| `displayport.png`  | DisplayPort                  |
| `dvi.png`          | DVI                          |
| `vga.png`          | VGA                          |
| `audio-out.png`    | Jack verde (altavoces)       |
| `audio-in.png`     | Jack azul (entrada)          |
| `audio-mic.png`    | Jack rosa (micrófono)        |
| `usb-c.png`        | USB-C (cable señuelo)        |
| `rj11.png`         | RJ-11 teléfono (señuelo)     |

## Formato recomendado

- **PNG con transparencia**, recortado al conector (sin margen sobrante).
- **Tamaño**: 512 × 512 px es más que suficiente (o el doble si es un conector
  alargado, p. ej. 1024 × 512).
- **Peso**: que no pase de ~200 KB por imagen.
- Fondo transparente, conector centrado y con luz uniforme.

Si un PNG falta, ese conector se dibuja con la forma procedural de
`src/three/Placeholder.tsx` y el simulador sigue funcionando.
