# AGENTS.md

Guía para agentes de IA y para cualquiera que trabaje en este repositorio.
**Mantener actualizado** cuando se tomen decisiones de diseño, se añadan fases,
se cambie la estructura de carpetas o se modifique el flujo de trabajo.

---

## 1. Qué es este proyecto

Simulador 3D interactivo de **montaje de PC** para la asignatura de Tecnología
de **4º de la ESO**. El alumnado monta un ordenador arrastrando componentes
hasta su sitio, en **4 fases** (identificación → placa base → conectores
traseros → periféricos), con dos modos de juego (práctica y examen) y una ficha
didáctica por componente.

- No hay backend ni cuentas de usuario: todo ocurre en el navegador.
- Objetivo: funcionar en portátiles y Chromebooks modestos del aula.
- Todo el texto didáctico está en español y con nivel de 4º ESO.

## 2. Stack y comandos

| Área      | Elección                                            |
| --------- | --------------------------------------------------- |
| Build     | Vite 8 + TypeScript 6 (estricto)                    |
| UI        | React 19                                            |
| 3D        | Three.js + `@react-three/fiber` + `@react-three/drei` |
| Estado    | Zustand 5                                           |
| Lint      | oxlint                                              |

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # tsc -b + vite build (debe pasar siempre)
npm run lint     # oxlint (debe quedar sin avisos)
npm run preview  # servir la build de producción
npm run models:optimize  # comprimir los .glb de public/assets/models
```

## 3. Flujo de trabajo con git

- **`main`** → solo versiones estables / entregables.
- **`develop`** → rama de trabajo. **Todos los cambios van aquí por defecto.**
- Ramas cortas desde `develop`: `feat/...`, `fix/...`, `docs/...`.
- Nunca hacer commit, amend, push ni PR sin que lo pida explícitamente la
  persona usuaria.
- Remoto: `origin` → https://github.com/jmoredev/PC-Simulator.git

## 4. Estructura de carpetas

```
PC-Emulator/
├── public/
│   └── assets/
│       ├── models/          # .glb de los componentes (ver su README.md)
│       └── textures/        # texturas sueltas (opcional)
├── models-originales/       # .glb sin optimizar (IGNORADO por git).
│   └── placas/              # una placa por archivo: <id>.glb, sin comprimir
├── .scratch/                # calibraciones y capturas de depuración. IGNORADO.
├── scripts/
│   └── optimize-models.mjs  # comprime los .glb para servirlos por web
├── tests/
│   ├── package.json         # puppeteer-core, aislado de la app
│   └── run.mjs              # pruebas e2e (calibración + partida completa)
├── src/
│   ├── assets/
│   │   └── connectors/      # PNG de cada conector de la fase 2 (ver su README)
│   ├── data/
│   │   ├── stages.ts        # las 3 fases: disposición, bandeja y cámara
│   │   ├── components.ts    # MOUNTS (huecos) + COMPONENTS (catálogo didáctico)
│   │   ├── boards.ts        # registro de placas base (?board=<id>)
│   │   ├── ports.ts         # color y forma de cada puerto trasero
│   │   └── assets.ts        # activación de modelos (.env) y rutas
│   ├── calibration.ts       # huecos calibrables y derivación del layout
│   ├── store/
│   │   ├── useGameStore.ts  # estado global: fase, progreso, fallos, modo, drag
│   │   └── useCalibrationStore.ts # marcas del modo calibración (localStorage)
│   ├── three/
│   │   ├── Scene.tsx        # composición de la escena, luces, bandeja, arrastre, cámara
│   │   ├── StageIdentify.tsx # fase 1: los carteles con el nombre de cada pieza
│   │   ├── StageBoard.tsx   # fase 2: placa sobre alfombrilla antiestática
│   │   ├── StagePorts.tsx   # fase 2: panel de puertos trasero tumbado + torre
│   │   ├── StagePeripherals.tsx # fase 3: escritorio y torre terminada
│   │   ├── Motherboard.tsx  # geometría de la placa base y sus zócalos
│   │   ├── ComponentModel.tsx # carga de .glb, auto-fit, rotación y fallback
│   │   ├── Placeholder.tsx  # geometría procedural de cada componente
│   │   ├── MountZone.tsx    # zonas resaltadas de los huecos
│   │   ├── CalibrationPicker.tsx # captura de puntos en modo calibración
│   │   ├── DebugGrid.tsx    # rejilla de coordenadas (?debug=1)
│   │   └── primitives.tsx   # helpers Box / Cyl / Ball
│   ├── ui/                  # menú, lista por fases, ficha, progreso, resultados, calibración y leyenda
│   ├── types.ts             # tipos compartidos (Stage, MountPoint, ComponentDef…)
│   ├── App.tsx              # lienzo 3D + capas de interfaz
│   ├── main.tsx             # punto de entrada
│   └── index.css            # todos los estilos
├── AGENTS.md                # este archivo
├── CREDITS.md               # autor, fuente y licencia de cada modelo e imagen
├── README.md                # documentación para docentes / usuarios
├── vite.config.ts           # plugin de dev que guarda la calibración
└── .env.example             # plantilla para activar los modelos .glb
```

## 5. Modelo de datos (dónde se toca el contenido)

Todo el contenido vive en `src/data/`; no hay que tocar la 3D para añadir piezas.

- **`Stage`** (`stages.ts`): fase del montaje. Tiene `id`
  (`identify` | `board` | `ports` | `peripherals`), superficie de trabajo
  (`bench`), rejilla de la bandeja (`tray`), cámara (`camera`) y plano de
  arrastre (`drop`).
- **`MountPoint`** (`MOUNTS`): un hueco. Tiene `stage`, `position` (base del
  componente), `accepts` (tipos válidos), `snapRadius`, `size` (`[largo, ancho]`
  de la zona resaltada), `angle` (giro en el plano XZ) y `order`.
- **`ComponentDef`** (`COMPONENTS`): una pieza. Tiene `kind`, `stage`, `mountId`,
  `size` (dimensión máxima para normalizar el modelo), `rotation` (giro [x,y,z]
  del modelo), `trayPos`, `identifyPos` (mesa de la fase 1), color y los textos
  didácticos (`description`, `funFact`). Los **cables señuelo** no tienen
  `mountId` y llevan `decoy: true`.
- **`STAGE_STEPS`**: piezas a colocar en cada fase (en la identificación, todas,
  incluidos los señuelos). `TOTAL_STEPS` es la suma: el progreso de la partida.

Reglas de layout:

- **1 unidad ≈ 10 cm** y **Y hacia arriba**.
- La placa base (ATX) mide `~3.05 × 2.28` unidades. Las posiciones de sus huecos
  salen del modo calibración, no de estimaciones a ojo (ver sección 7).
- Las posiciones de la bandeja se calculan solas por fase a partir de la rejilla
  (`traySlot`) y el panel se ajusta a las piezas con `trayPanelFor`.

## 6. Decisiones de diseño (registro)

| # | Decisión | Por qué |
| - | -------- | ------- |
| 1 | **Three.js + React Three Fiber**, no Three.js puro | Se mantiene la potencia de Three.js con un modelo declarativo; drei aporta `OrbitControls`, `Html` y `useGLTF` resueltos. |
| 2 | **Zustand** para el estado | Muy ligero, sin providers, fácil de consumir desde R3F (`useGameStore`) y desde la UI. |
| 3 | **Montaje en 4 fases** (`identify` → `board` → `ports` → `peripherals`) | Empezar reconociendo las piezas, separar el interior del PC del reconocimiento de los puertos traseros y terminar con los periféricos a escala real da un flujo claro y sin mezclar escalas. |
| 4 | **Plano de arrastre configurable por fase** (`stage.drop`) | El puntero se proyecta sobre un plano: horizontal en la placa y los periféricos (`Y = DROP_Y`), y **vertical** en la fase de conectores (`X = chapa`), que se juega en el plano YZ. Una sola mecánica, cambiando solo el plano y los dos ejes que se comparan. |
| 5 | **El panel trasero se muestra tumbado, con los puertos hacia arriba** | Mantiene el plano horizontal (decisión 4) y deja ver y clicar todos los conectores a la vez. |
| 6 | **Periféricos a escala realista** | Un monitor es más ancho que la placa base; mostrarlo a escala enseña la diferencia de tamaño y evita la sensación de "juguete". |
| 7 | **La fase 2 es conectar los cables**, no montar la caja | El montaje dentro de la caja era poco realista y no aportaba nada; con la placa ya montada, lo didáctico es reconocer cada puerto trasero y elegir el conector macho que encaja. |
| 8 | **Placeholders procedurales + `.glb` opcional** | El simulador funciona desde el primer momento sin assets; los modelos se añaden después. |
| 9 | **Auto-fit de los modelos** (`Box3` → centrar y escalar a `def.size`) | Cualquier `.glb` vale sea cual sea su escala y su origen, sin ajustes manuales. |
| 10 | **Fallback silencioso con `ErrorBoundary` + `Suspense`** | Si un `.glb` falta o falla, esa pieza usa su placeholder y la app no se rompe. |
| 11 | **Dos entradas: arrastrar-y-soltar y clic-y-clic** | El ratón/trackpad del aula no siempre permite arrastrar cómodo; el clic sobre la zona iluminada es más accesible. |
| 12 | **No se pierde la pieza al fallar** | Para la ESO es más tolerable: si sueltas mal, sigues con la pieza seleccionada y puedes reintentar. `Esc` cancela. |
| 13 | **Avance automático de fase + aviso central** | Menos fricción: al completar una fase la cámara se mueve sola y aparece un cartel con lo siguiente. |
| 14 | **El examen no muestra zonas ni etiquetas** | Sin pistas de verdad; solo hay feedback al acertar o fallar. Cada fallo resta 10 puntos. |
| 15 | **Un solo sentido de montaje por pieza**, sin validar el orden | Se puede montar en cualquier orden; las pistas de la fase en práctica indican qué toca. |
| 16 | **Optimización obligatoria de los `.glb`** (`npm run models:optimize`) | Los modelos originales sumaban 225 MB (texturas de 4096 px). Con WebP 1024 + cuantización + simplificación se quedan en ~13 MB (94 % menos), que sí se puede servir en el aula. |
| 17 | **Compresión sin decodificadores externos**: `KHR_mesh_quantization` + `EXT_texture_webp` | three.js las soporta de serie, así que `useGLTF` carga los modelos sin configurar DRACO ni meshopt (y sin depender de una CDN). |
| 18 | **El script de optimización nunca pierde el original** y salta lo ya optimizado | Detecta `KHR_mesh_quantization` como marca de "ya optimizado". *(Ver la nota de la sección 7: el temporal debe acabar en `.glb`.)* |
| 19 | **Los originales pesados viven en `models-originales/` e ignorados por git** | Se conservan para reoptimizar sin ensuciar el repo ni GitHub (225 MB). |
| 20 | **Modo calibración interactivo** (`?calibrate=1`) | Los zócalos reales de un `.glb` no se pueden adivinar. El usuario marca cada hueco con el ratón y se guarda en `.scratch/calibration.json`. Sirve para cualquier placa nueva. |
| 21 | **Las pruebas e2e viven en `tests/` con su propio `package.json`** | `puppeteer-core` es solo para verificar; así no entra en las dependencias de la app. |
| 22 | **Cada componente tiene su propia `rotation` [x,y,z] y se reajusta la base** | Los `.glb` vienen de fuentes distintas y no comparten orientación (la RAM viene tumbada). `Align`/`GltfModel` giran y vuelven a centrar/base-alinear, memorizando el cálculo para no recorrer 115k vértices por frame. |
| 23 | **Las etiquetas de las zonas tienen la altura limitada** (`Math.min(d/2 + 0.18, 0.6)`) | En zonas muy largas (GPU, placa) la etiqueta se iba muy arriba y quedaba fuera de pantalla. |
| 24 | **Calibración de ranuras por sus dos extremos** | Un solo punto no dice dónde está el centro a lo largo de la ranura ni su ángulo; con los dos extremos se derivan centro, `angle` y `length`, y la pieza queda alineada. |
| 25 | **El giro de la ranura se aplica en un grupo padre** (después de la `rotation` del modelo) | Si se suman los dos en el mismo Euler, un modelo tumbado (la RAM) acaba con su longitud en vertical. Anidando, primero se orienta el modelo y luego se gira sobre la vertical. |
| 26 | **Cables señuelo** (`decoy: true`) | En la fase 2 hay cables que no encajan en ningún puerto (USB-C, RJ-11). Obligan a razonar, no tienen `mountId` y **no cuentan** para terminar (`TOTAL_STEPS`). |
| 27 | **La fase 2 enfoca la chapa trasera de frente** (plano de arrastre vertical) | La chapa I/O es una franja de 15 × 2,6 cm con los puertos apilados en vertical: vista desde arriba, dos puertos de la misma pila coinciden. De frente, se distinguen y la placa sigue viéndose en 3D con lo que ya está montado. |
| 28 | **Leyenda de controles ocultable** (`ControlsHelp`) | Aparece durante el montaje, se cierra con la `?` y el estado se recuerda en `localStorage`. Quitarla de en medio evita distracciones en el examen. |
| 29 | **Varias placas base con `?board=<id>`** | `src/data/boards.ts` es el registro (id, nombre, tamaño, giro y ruta del modelo). Se elige por URL y la placa activa alimenta `BOARD_MODEL`. |
| 30 | **Los modelos de placa NO se comprimen en desarrollo** | El plugin `boardModels` de `vite.config.ts` sirve `/assets/models/placas/<id>.glb` leyendo de `models-originales/placas/<id>.glb` (ignorado por git). Así se ve nítido y el repo no engorda. `models:optimize` queda solo para publicar. |
| 31 | **Calibración por placa** (`calibration-<id>.json`) | Los huecos y los puertos traseros se guardan por placa. El calibrador marca la chapa trasera (2 esquinas) y cada puerto con su tipo, para poder enlazarlos con la fase 2. |
| 32 | **Los cables de la fase 2 son imágenes PNG**, no modelos 3D | Se llaman como su `kind` (`src/assets/connectors/hdmi.png`) y se arrastran desde la **barra inferior de cables** (`ConnectorBar`). `connectorImageUrl` usa `import.meta.glob`, así que un PNG que falte cae al placeholder sin ensuciar ni romper nada. |
| 33 | **Cada placa tiene sus propios huecos de fase 1** (`board.mounts`) | Los zócalos cambian de sitio entre placas; `boardMounts()` aplica la calibración de la placa activa sobre los valores de referencia y el disipador se deriva de la CPU. |
| 34 | **La fase 2 se genera desde la calibración** (`rear` + `ports`) | Un cable por cada tipo de conector de la placa (más los señuelos), y un hueco por puerto. Varios puertos del mismo tipo valen indistintamente, así que la fase termina al colocar todos los **cables**, no al llenar todos los puertos. |
| 35 | **El cable colocado es una pieza 3D simple** (`ConnectorPlug`), no la imagen | Una imagen plana sobre la chapa no da sensación de cable enchufado; con un conector de cajas y un latiguillo que sale y cae sí. |
| 36 | **El calibrador cambia a la cámara trasera** al marcar la chapa o un puerto | Marcar los puertos desde arriba era impreciso (los apilados coinciden en XZ); de frente se ve cada uno y la calibración sale exacta. |
| 37 | **Fase 0 de identificación**: todas las piezas sobre la mesa y un cartel por pieza | Antes de montar hay que reconocer el material. Los carteles llevan el nombre siempre visible (son las respuestas) y hay **uno por pieza** (los dos módulos de RAM tienen su cartel, ambos con el mismo texto) para que cualquiera valga. |
| 38 | **Al identificar, la pieza no se queda encima del cartel**: el cartel se pone verde | Muchas piezas (el monitor, la GPU) tapaban el resto de carteles. Con el cartel en verde se ve el avance y no estorba. |
| 39 | **La disposición de la mesa se baraja en cada partida** (`shuffleLayout`) | Si las piezas y los carteles salen siempre en el mismo sitio, se memorizan las posiciones en vez de reconocer las piezas. Las piezas y los carteles se barajan **por separado**. |
| 40 | **En práctica hay un botón para saltar de fase** (`skipStage`) | Para poder ir directo al montaje sin completar la identificación. En examen no aparece. |
| 41 | **Solo un módulo de RAM y un cable señuelo** (USB-C) | Con dos módulos había que repetir el mismo gesto dos veces y el RJ-11 sobraba; los dos huecos de RAM siguen ahí y valen indistintamente. |
| 42 | **Créditos por archivo** (`CREDITS.md` + Menú → Créditos y licencias) | Los modelos son de terceros y casi todos CC con atribución; hay que citar autor, fuente, licencia y **los cambios** (están optimizados). La tabla de `CREDITS.md` y `src/data/credits.ts` se mantienen en paralelo. |

## 7. Pipeline de assets 3D

- Sin modelos: se usan las formas de `Placeholder.tsx`.
- Con modelos: dejar los `.glb` en `public/assets/models/`; se usan por defecto.
  Para desactivarlos, `.env` con `VITE_USE_MODELS=false` (ver `.env.example`).
- El nombre del archivo debe ser el `id` del componente (p. ej. `gpu.glb`,
  `motherboard.glb`). Un `def.model` explícito tiene prioridad.
- Especificaciones y tabla de nombres: `public/assets/models/README.md`.

### Placas base (varias, sin comprimir)

Cada placa es un `.glb` **sin optimizar** en `models-originales/placas/<id>.glb`
(esa carpeta está ignorada por git). En desarrollo, el plugin `boardModels` de
`vite.config.ts` sirve `/assets/models/placas/<id>.glb` desde ahí, así el modelo
se ve nítido y no engorda el repo. La placa activa se elige con `?board=<id>` y
se registra en `src/data/boards.ts`.

Cada entrada de `boards.ts` lleva:

- `size` y `rawSize`: el tamaño real y las dimensiones del `.glb` (para el
  auto-fit y para el panel de la fase 2).
- `rotation`: giro del modelo para dejarlo plano con Y hacia arriba.
- `mounts`: los huecos de la fase 1 calibrados (CPU, RAM ×2, M.2 y PCIe).
- `rear`: la chapa I/O marcada por sus dos esquinas (centro, ángulo y longitud).
- `ports`: cada puerto trasero con su tipo, en coordenadas del modelo.

> `npm run models:optimize` **no se aplica** a las placas en desarrollo. Solo se
> optimizan si hay que publicarlas en el aula (peso), y nunca el original.

### Calibración de una placa (`?calibrate=1`)

Los zócalos y la parte trasera de un `.glb` real no se pueden deducir del código.
Para cada modelo de placa base:

1. `npm run dev` y abrir `http://localhost:5173/?calibrate=1&board=<id>`.
2. Marcar cada hueco en la placa. El **zócalo de la CPU** es un punto; las
   **ranuras (RAM ×2, M.2 y PCIe)** piden **los dos extremos**, de ahí se saca el
   centro, el ángulo y la longitud.
3. Marcar el **panel trasero** (las dos esquinas de la chapa I/O) y, en
   *Puertos traseros*, elegir el tipo de conector y clicar sobre cada puerto. Al
   elegir la chapa o un puerto, la cámara se pone **de frente** para que salgan
   exactos.
4. Pulsar **Guardar en el proyecto**: escribe `.scratch/calibration-<id>.json`
   (solo en desarrollo, vía el plugin `calibrationSaver` de `vite.config.ts`).
5. Volcar el `layout` resultante en `boards.ts`: los huecos de la fase 1 en
   `mounts`, y la chapa + los puertos en `rear` y `ports`.

El aviso `?debug=1` superpone una rejilla con coordenadas para comprobar los
valores a mano.

**Nota sobre el panel trasero.** En una placa real la chapa I/O es una franja
estrecha en el borde (unos 15 × 2,6 cm) y los puertos van **apilados en
vertical**: en el plano XZ dos puertos de la misma pila coinciden. Por eso la
fase 2 gira la cámara hasta ponerse **de frente a la chapa** y resuelve el
arrastre sobre un **plano vertical** (`stage.drop` = `vertical`, `x` = la X de la
chapa): así la placa se sigue viendo en 3D con todo lo montado, los puertos se
distinguen y los huecos son los de `ports` sin transformar. Los cables no están
en la mesa: se arrastran desde la barra lateral de piezas.

### Imágenes de los conectores (fase 2)

Los conectores no tienen modelo 3D: se dibujan con un PNG tumbado en el plano,
que se llama igual que su `kind` y vive en `src/assets/connectors/`
(`hdmi.png`, `usb.png`, `audio-out.png`…). El glob de `connectorImageUrl` solo
devuelve los que existen, así que se pueden ir añadiendo de uno en uno.

| Archivo | Conector | Archivo | Conector |
| ------- | -------- | ------- | -------- |
| `ps2.png` | PS/2 | `displayport.png` | DisplayPort |
| `usb.png` | USB-A | `dvi.png` | DVI |
| `lan.png` | RJ-45 | `vga.png` | VGA |
| `hdmi.png` | HDMI | `audio-out/in/mic.png` | jacks verde/azul/rosa |
| `usb-c.png` | USB-C (señuelo) | `rj11.png` | RJ-11 (señuelo) |

**Orientación de los modelos:** cada `.glb` viene de una fuente distinta. El
campo `rotation` del componente corrige su eje (la RAM viene tumbada → −90° en
X). El ángulo de la ranura (`mount.angle`) se suma a la rotación en Y, así el
mismo modelo sirve para cualquier orientación de ranura. Los **cables de la fase
2 no tienen `.glb`**: se dibujan con las formas de `Placeholder.tsx`, porque el
panel de puertos es una maqueta ampliada y no un modelo real.

### Optimización (obligatoria antes de subir modelos)

```bash
npm run models:optimize                                  # optimiza in situ
npm run models:optimize -- --backup models-originales     # guarda copia antes
npm run models:optimize -- --force                       # reoptimiza todo
```

- Aplica `--texture-size 1024 --texture-compress webp --compress quantize
  --simplify true`. Resultado real: 225 MB → 13 MB.
- **Detecta y salta** los archivos que ya tienen `KHR_mesh_quantization`.
- **Trampa conocida:** `gltf-transform` elige el formato de salida por la
  extensión del archivo. El temporal *debe* terminar en `.glb`
  (`.nombre.glb.tmp.glb`); si no, escribe un glTF JSON con extensión `.glb` y
  el modelo deja de cargar. Ya está corregido en el script.
- No descargar modelos con licencia dudosa; si se aportan, citar autor y
  licencia.

## 8. Interacción (resumen técnico)

- `TrayItem.onPointerDown` (o el asa de la lista de piezas en la fase 2) inicia
  el arrastre; `DragController` escucha `pointermove`/`pointerup` en `window` y
  proyecta el rayo sobre el plano de la fase (`horizontal` o `vertical`).
- `updateDrag` calcula el hueco candidato más cercano dentro de `snapRadius`,
  comparando las dos coordenadas del plano de la fase, y resalta el fantasma con
  imán.
- `endDrag` coloca si hay candidato; si no, cuenta fallo solo en examen y marca
  en rojo el hueco erróneo (`wrongRadius` de la fase) con feedback breve.
- En práctica, `MountZone` muestra la zona y su etiqueta y admite clic directo
  (`placeInto`).
- `OrbitControls` se desactiva mientras se arrastra para no rotar la cámara.

## 9. Convenciones de código

- TypeScript estricto con `verbatimModuleSyntax` y `erasableSyntaxOnly`:
  **usar `import type`** y **no usar `enum`** (usar uniones de literales).
- Sin comentarios salvo cuando expliquen un porqué no evidente.
- Componentes de React funcionales; estado de juego en Zustand, estado de UI
  local con `useState`.
- Estilos centralizados en `src/index.css` con clases tipo BEM
  (`stage-banner__kicker`, `comp-item--active`).
- No añadir dependencias sin justificarlo en este archivo.

## 10. Verificación

No hay suite de tests automáticos. Antes de dar por bueno un cambio:

1. `npx tsc -b` (o `npm run build`) sin errores.
2. `npm run lint` sin avisos.
3. `node tests/run.mjs` con el servidor de desarrollo levantado (comprueba el
   modo calibración y una partida completa de las 3 fases).
El arnés de `tests/` usa Chromium headless vía `puppeteer-core` y es la forma
rápida de detectar regresiones en la colocación de piezas, el avance de fase y
el conteo de fallos.
