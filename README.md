# Simulador de montaje de PC (Tecnología · 4º ESO)

Simulador 3D interactivo donde el alumnado monta un ordenador pieza a pieza
arrastrando los componentes hasta su sitio, con dos modos de juego y una ficha
didáctica para cada componente.

![modos](https://img.shields.io/badge/modos-práctica%20%7C%20examen-38bdf8)

## Qué incluye

- **Montaje en 3 fases**, cada una con su propia escena 3D:
  1. **Sobre la placa base**: CPU, disipador, 2× RAM, SSD M.2 y tarjeta gráfica.
  2. **Dentro de la caja**: se instala la **placa ya montada**, la fuente de
     alimentación, 2 ventiladores y un disco duro (HDD) en una caja abierta.
  3. **Periféricos**: monitor, teclado, ratón y altavoces a **escala realista**
     junto al PC ya montado.
- **Modo práctica**: al coger una pieza se ilumina su hueco en verde con el
  nombre del sitio.
- **Modo examen**: sin pistas, cuenta fallos y da una nota sobre 100, con tiempo
  y precisión.
- **Ficha didáctica** de cada componente (qué es, para qué sirve y un dato
  curioso), adaptada a 4º de la ESO.
- **Funciona sin assets**: si no hay modelos `.glb`, se usan formas 3D
  procedurales. Solo hay que soltar los modelos y activarlos.
- Al completar una fase, la cámara se desplaza sola a la siguiente y aparece un
  aviso con lo que toca hacer.

## Cómo arrancarlo

```bash
npm install
npm run dev
```

Abre la dirección que aparece en la terminal (por defecto
`http://localhost:5173`).

Otros comandos:

```bash
npm run build     # comprueba tipos y genera la versión de producción en dist/
npm run preview   # sirve la versión de producción
npm run lint      # oxlint
npm run models:optimize   # comprime los .glb de public/assets/models
```
## Controles

- **Arrastrar y soltar**: coge una pieza de la bandeja y llévala a su sitio.
- **Clic y clic**: haz clic en una pieza de la bandeja (o de la lista) y luego
  en la zona iluminada (solo en modo práctica).
- **Ratón**: botón izquierdo para girar la cámara, rueda para acercar/alejar.
- **Esc**: cancela el arrastre en curso.

## Desarrollo y ramas

- **`main`** → versiones estables y entregables.
- **`develop`** → rama de trabajo; **todo el desarrollo va aquí**.
- Ramas cortas desde `develop` con prefijo `feat/`, `fix/` o `docs/`.

```bash
git clone https://github.com/jmoredev/PC-Simulator.git
cd PC-Simulator
git checkout develop
npm install
```

Las decisiones de diseño, la estructura de carpetas y las convenciones están
documentadas en [`AGENTS.md`](AGENTS.md).

## Pruebas

Con el servidor de desarrollo levantado:

```bash
node tests/run.mjs     # calibración + partida completa de las 3 fases
```

Usa Chromium headless (`puppeteer-core`) instalado aparte en `tests/`, así que
no añade dependencias a la app.

## Modelos 3D (opcional)

El simulador trae figuras 3D hechas por código, así que **funciona desde el
primer momento**. Para usar modelos reales con texturas:

1. Mete los archivos en `public/assets/models/`.
2. Copia `.env.example` a `.env` (con `VITE_USE_MODELS=true`).
3. Reinicia el servidor de desarrollo.

Los nombres exactos de los archivos y sus especificaciones están en
[`public/assets/models/README.md`](public/assets/models/README.md).

El cargador **centra y reescala** cada modelo automáticamente, y si un archivo
falta o falla, ese componente vuelve a su forma procedural sin romper nada.

Los `.glb` originales suelen pesar demasiado para el aula (los de este proyecto
sumaban 225 MB). Pásales el compresor antes de subirlos y quedan en ~13 MB:

```bash
npm run models:optimize -- --backup models-originales
```

Los originales sin optimizar se guardan en `models-originales/`, que está
ignorado por git.

### Calibrar una placa nueva

Cada placa base tiene sus huecos en sitios distintos. Para una placa nueva:

```bash
npm run dev
# abre http://localhost:5173/?calibrate=1
```

Se marca el zócalo de la CPU con un clic y cada ranura (RAM ×2, M.2, PCIe) con
**dos clics, uno en cada extremo**. Al pulsar **Guardar en el proyecto** se
escribe `.scratch/calibration.json` y esas coordenadas se vuelcan en
`src/data/components.ts`. El modo solo existe en desarrollo.

## Cómo añadir o cambiar componentes

Todo el contenido didáctico y las posiciones viven en dos archivos:

- [`src/data/stages.ts`](src/data/stages.ts): las **3 fases**, con su superficie
  de trabajo, la bandeja de componentes y la cámara de cada una.
- [`src/data/components.ts`](src/data/components.ts): los **huecos** (`MOUNTS`,
  con su fase, posición, qué tipos acepta y radio de imán) y el **catálogo**
  (`COMPONENTS`, con nombre, descripción y datos curiosos).

Para añadir una pieza nueva basta con crear su entrada en `COMPONENTS` con el
`stage` y el `mountId` correspondientes, y su forma procedural en
`src/three/Placeholder.tsx`.

## Estructura del proyecto

```
src/
├── data/
│   ├── stages.ts        # las 3 fases y la disposición de cada escena
│   ├── components.ts    # huecos + catálogo didáctico (TODO el contenido)
│   └── assets.ts        # activación y rutas de modelos/texturas
├── store/
│   └── useGameStore.ts  # estado (fase, progreso, fallos, modo, arrastre)
├── three/
│   ├── Scene.tsx        # escena, luces, banco, bandeja, arrastre y cámara
│   ├── StageBoard.tsx   # fase 1: placa base sobre la alfombrilla
│   ├── StageCase.tsx    # fase 2: caja abierta con bandeja, bahía y anclajes
│   ├── StagePeripherals.tsx # fase 3: escritorio y torre terminada
│   ├── Motherboard.tsx  # placa base y sus zócalos
│   ├── ComponentModel.tsx # carga .glb + placa ensamblada + fallback
│   ├── Placeholder.tsx  # geometría procedural de cada componente
│   ├── MountZone.tsx    # zonas resaltadas de los huecos
│   └── primitives.tsx   # cajas, cilindros y esferas reutilizables
├── ui/                  # menú, lista por fases, ficha, progreso y resultados
└── App.tsx              # composición del lienzo y la interfaz
```

## Tecnologías

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Three.js](https://threejs.org/) con [@react-three/fiber](https://r3f.docs.pmnd.rs/)
  y [@react-three/drei](https://github.com/pmndrs/drei)
- [Zustand](https://zustand.docs.pmnd.rs/) para el estado

## Notas para el aula

- Pensado para funcionar en portátiles y Chromebooks modestos: si va lento,
  baja el `dpr` en `src/App.tsx` o desactiva las sombras (`shadows`).
- El modo examen es una buena evaluación inicial; el modo práctica, para
  introducir el vocabulario técnico.
