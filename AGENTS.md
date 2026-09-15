# AGENTS.md

Guía para agentes de IA y para cualquiera que trabaje en este repositorio.
**Mantener actualizado** cuando se tomen decisiones de diseño, se añadan fases,
se cambie la estructura de carpetas o se modifique el flujo de trabajo.

---

## 1. Qué es este proyecto

Simulador 3D interactivo de **montaje de PC** para la asignatura de Tecnología
de **4º de la ESO**. El alumnado monta un ordenador arrastrando componentes
hasta su sitio, en dos modos de juego (práctica y examen) y con una ficha
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
├── src/
│   ├── data/
│   │   ├── stages.ts        # las 3 fases: disposición, bandeja y cámara
│   │   ├── components.ts    # MOUNTS (huecos) + COMPONENTS (catálogo didáctico)
│   │   └── assets.ts        # activación de modelos (.env) y rutas
│   ├── store/
│   │   └── useGameStore.ts  # estado global: fase, progreso, fallos, modo, drag
│   ├── three/
│   │   ├── Scene.tsx        # composición de la escena, luces, bandeja, arrastre, cámara
│   │   ├── StageBoard.tsx   # fase 1: placa sobre alfombrilla antiestática
│   │   ├── StageCase.tsx    # fase 2: caja abierta (bandeja, bahía PSU, anclajes)
│   │   ├── StagePeripherals.tsx # fase 3: escritorio y torre terminada
│   │   ├── Motherboard.tsx  # geometría de la placa base y sus zócalos
│   │   ├── ComponentModel.tsx # carga de .glb, auto-fit, fallback y placa ensamblada
│   │   ├── Placeholder.tsx  # geometría procedural de cada componente
│   │   ├── MountZone.tsx    # zonas resaltadas de los huecos
│   │   └── primitives.tsx   # helpers Box / Cyl / Ball
│   ├── ui/                  # menú, lista por fases, ficha, progreso, resultados
│   ├── types.ts             # tipos compartidos (Stage, MountPoint, ComponentDef…)
│   ├── App.tsx              # lienzo 3D + capas de interfaz
│   ├── main.tsx             # punto de entrada
│   └── index.css            # todos los estilos
├── AGENTS.md                # este archivo
├── README.md                # documentación para docentes / usuarios
└── .env.example             # plantilla para activar los modelos .glb
```

## 5. Modelo de datos (dónde se toca el contenido)

Todo el contenido vive en `src/data/`; no hay que tocar la 3D para añadir piezas.

- **`Stage`** (`stages.ts`): fase del montaje. Tiene `id`
  (`board` | `case` | `peripherals`), superficie de trabajo (`bench`), rejilla de
  la bandeja (`tray`) y cámara (`camera`).
- **`MountPoint`** (`MOUNTS`): un hueco. Tiene `stage`, `position` (base del
  componente), `accepts` (tipos válidos), `snapRadius`, `size` (zona resaltada) y
  `order`.
- **`ComponentDef`** (`COMPONENTS`): una pieza. Tiene `kind`, `stage`, `mountId`,
  `size` (dimensión máxima para normalizar el modelo), `trayPos`, color y los
  textos didácticos (`description`, `funFact`).

Reglas de layout:

- **1 unidad ≈ 10 cm** y **Y hacia arriba**.
- La placa base (ATX) mide `3.05 × 2.44` unidades; su cara superior está en
  `BOARD_TOP = 0.24`.
- Las posiciones de la bandeja se calculan solas por fase a partir de la rejilla
  (`traySlot`) y el panel se ajusta a las piezas con `trayPanelFor`.

## 6. Decisiones de diseño (registro)

| # | Decisión | Por qué |
| - | -------- | ------- |
| 1 | **Three.js + React Three Fiber**, no Three.js puro | Se mantiene la potencia de Three.js con un modelo declarativo; drei aporta `OrbitControls`, `Html` y `useGLTF` resueltos. |
| 2 | **Zustand** para el estado | Muy ligero, sin providers, fácil de consumir desde R3F (`useGameStore`) y desde la UI. |
| 3 | **Montaje en 3 fases** (`board` → `case` → `peripherals`), cada una con su escena | Separar el montaje de la placa del montaje en la caja evita mezclar escalas y hace el flujo más claro. La fase 3 usa periféricos a escala real. |
| 4 | **Todos los puntos de montaje en plano horizontal** | El arrastre proyecta el puntero sobre un plano `Y = DROP_Y`. Una sola mecánica para las 3 fases, sin raycast contra planos distintos. |
| 5 | **La caja se muestra tumbada con el interior hacia arriba** | Mantiene el plano horizontal (decisión 4) y es como se monta de verdad sobre la mesa. |
| 6 | **Periféricos a escala realista** | Un monitor es más ancho que la placa base; mostrarlo a escala enseña la diferencia de tamaño y evita la sensación de "juguete". |
| 7 | **La placa es ensamblable**: en la fase 2 se arrastra la placa con todo lo montado (`BoardAssembly`) | Refuerza la idea de que la fase 1 produce una unidad que luego se instala en la caja. |
| 8 | **Placeholders procedurales + `.glb` opcional** | El simulador funciona desde el primer momento sin assets; los modelos se añaden después. |
| 9 | **Auto-fit de los modelos** (`Box3` → centrar y escalar a `def.size`) | Cualquier `.glb` vale sea cual sea su escala y su origen, sin ajustes manuales. |
| 10 | **Fallback silencioso con `ErrorBoundary` + `Suspense`** | Si un `.glb` falta o falla, esa pieza usa su placeholder y la app no se rompe. |
| 11 | **Dos entradas: arrastrar-y-soltar y clic-y-clic** | El ratón/trackpad del aula no siempre permite arrastrar cómodo; el clic sobre la zona iluminada es más accesible. |
| 12 | **No se pierde la pieza al fallar** | Para la ESO es más tolerable: si sueltas mal, sigues con la pieza seleccionada y puedes reintentar. `Esc` cancela. |
| 13 | **Avance automático de fase + aviso central** | Menos fricción: al completar una fase la cámara se mueve sola y aparece un cartel con lo siguiente. |
| 14 | **El examen no muestra zonas ni etiquetas** | Sin pistas de verdad; solo hay feedback al acertar o fallar. Cada fallo resta 10 puntos. |
| 15 | **Un solo sentido de montaje por pieza**, sin validar el orden | Se puede montar en cualquier orden; las pistas de la fase en práctica indican qué toca. |

## 7. Pipeline de assets 3D

- Sin modelos: se usan las formas de `Placeholder.tsx`.
- Con modelos: dejar los `.glb` en `public/assets/models/` y crear `.env` con
  `VITE_USE_MODELS=true` (ver `.env.example`).
- El nombre del archivo debe ser el `id` del componente (p. ej. `gpu.glb`,
  `motherboard.glb`). Un `def.model` explícito tiene prioridad.
- Especificaciones y tabla de nombres: `public/assets/models/README.md`.
- No descargar modelos con licencia dudosa; si se aportan, citar autor y
  licencia.

## 8. Interacción (resumen técnico)

- `TrayItem.onPointerDown` inicia el arrastre; `DragController` escucha
  `pointermove`/`pointerup` en `window` y proyecta el rayo sobre el plano
  horizontal.
- `updateDrag` calcula el hueco candidato más cercano dentro de `snapRadius` y
  resalta el fantasma con imán.
- `endDrag` coloca si hay candidato; si no, cuenta fallo solo en examen y marca
  en rojo el hueco erróneo (feedback breve).
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
3. Prueba manual: completar las 3 fases en modo práctica y un fallo en examen.

Para verificación automatizada se ha usado Chromium headless (puppeteer-core)
comprobando que se colocan las 14 piezas, que la fase avanza sola y que en
examen no hay etiquetas y sí conteo de fallos.
