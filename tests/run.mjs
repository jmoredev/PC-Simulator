/**
 * Pruebas end-to-end del simulador con Chromium headless.
 *
 *   npm run dev -- --port 5199        # en otra terminal
 *   node tests/run.mjs
 *
 * Variables: BASE_URL (por defecto http://localhost:5199), CHROME (ruta al binario;
 * si no se define, se busca en las cachés de puppeteer y Playwright y en las
 * instalaciones habituales de Chrome), ONLY (lista de secciones separadas por
 * comas; acota la pasada a esas, que es lo que hace viable comprobar una
 * falsación sin esperar los ~11 minutos de la pasada completa; un nombre que no
 * exista para la pasada con error en vez de decir «TODO OK» sin ejecutar nada).
 *
 * Aviso: si has tocado `src/`, **reinicia el servidor de desarrollo** antes de
 * correr el arnés. Con HMR, el import dinámico de `/src/store/useGameStore.ts`
 * puede devolver una COPIA distinta de la que usa la app (Vite añade `?t=…` al
 * módulo invalidado), y entonces las acciones del store no llegan a la partida:
 * las secciones que las usan fallan de forma desconcertante (§7, §12 y §13 usan
 * ese import; §14 y §15 van por la interfaz, así que no les afecta).
 * Se usa `localhost` y no `127.0.0.1` porque Vite 8 puede escuchar solo en IPv6
 * (`[::1]`); si la instancia de desarrollo escucha solo en IPv4, pásale
 * BASE_URL=http://127.0.0.1:5199.
 */
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import puppeteer from 'puppeteer-core'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5199'
/** Piezas totales de la lista con la placa por defecto (las 4 fases). */
const IDENTIFY = 18
const ITEMS = 36
/** Colocaciones de toda la partida (identificación + montaje + cables + periféricos). */
const PLACEABLE = 35

/**
 * Ruta a un Chromium usable. Antes solo miraba la caché de puppeteer en Linux,
 * así que en Windows el arnés no arrancaba sin pasar CHROME a mano. Ahora busca
 * en la caché de puppeteer (las tres plataformas), en los navegadores de
 * Playwright y en las instalaciones habituales de Chrome.
 */
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME

  const candidates = []
  const add = (...parts) => candidates.push(join(...parts))

  // Caché de puppeteer (por defecto ~/.cache/puppeteer/chrome).
  const puppeteerCache =
    process.env.PUPPETEER_CACHE_DIR ?? join(homedir(), '.cache', 'puppeteer', 'chrome')
  if (existsSync(puppeteerCache)) {
    for (const dir of readdirSync(puppeteerCache)) {
      add(puppeteerCache, dir, 'chrome-linux64', 'chrome')
      add(puppeteerCache, dir, 'chrome-linux', 'chrome')
      add(puppeteerCache, dir, 'chrome-win64', 'chrome.exe')
      add(puppeteerCache, dir, 'chrome-win', 'chrome.exe')
      add(puppeteerCache, dir, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
      add(puppeteerCache, dir, 'chrome-mac-x64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
    }
  }

  // Navegadores de Playwright, si están instalados (`npx playwright install`).
  const playwrightCache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    (process.platform === 'win32'
      ? join(process.env.LOCALAPPDATA ?? homedir(), 'ms-playwright')
      : process.platform === 'darwin'
        ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(homedir(), '.cache', 'ms-playwright'))
  if (existsSync(playwrightCache)) {
    for (const dir of readdirSync(playwrightCache).filter((d) => d.startsWith('chromium-'))) {
      add(playwrightCache, dir, 'chrome-linux', 'chrome')
      add(playwrightCache, dir, 'chrome-linux64', 'chrome')
      add(playwrightCache, dir, 'chrome-win64', 'chrome.exe')
      add(playwrightCache, dir, 'chrome-win', 'chrome.exe')
      add(playwrightCache, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
    }
  }

  // Chrome instalado en su sitio de siempre.
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? ''
    add('C:', 'Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe')
    add('C:', 'Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe')
    add(local, 'Google', 'Chrome', 'Application', 'chrome.exe')
  } else if (process.platform === 'darwin') {
    add('/Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome')
  } else {
    add('/usr', 'bin', 'google-chrome')
    add('/usr', 'bin', 'chromium')
    add('/usr', 'bin', 'chromium-browser')
  }

  const found = candidates.find((path) => existsSync(path))
  if (found) return found
  throw new Error(
    'No encuentro Chromium. Define CHROME=<ruta>. Se ha buscado en:\n  ' +
      candidates.join('\n  '),
  )
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Desplazamientos que prueba el arnés para coger una pieza de la mesa (fase 1). El
 * punto que se calcula es el centro de la pieza según su `size`, pero la pieza
 * dibujada la encoge `trayScaleFor` a 0,75 como mucho y en las anchas (el monitor)
 * su centro queda bastante por debajo: sin los desplazamientos hacia abajo, coger
 * el monitor falla y las comprobaciones dependientes caen como si fuera producto.
 */
const COGER_PIEZA = [
  [0, 0],
  [0, -10],
  [0, 10],
  [-10, 0],
  [10, 0],
  [0, -20],
  [0, 20],
  [-20, 0],
  [20, 0],
  [-14, -14],
  [14, 14],
]

/**
 * ¿El elemento existe Y ocupa sitio en pantalla? La presencia en el DOM no dice
 * nada: un panel plegado o una tarjeta sin montar siguen existiendo en el HTML.
 */
async function isVisible(page, selector) {
  return page
    .$$eval(selector, (els) =>
      els.some((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }),
    )
    .catch(() => false)
}

/**
 * ¿Se ve el panel de la pieza? Desde R4-001 el panel está montado durante toda la
 * fase 1 y se oculta sin selección, así que «está en el DOM» ya no distingue nada:
 * lo que dice que hay una pieza cogida es que se vea.
 */
async function zoomPanelVisible(page) {
  return page
    .$eval('.zoom', (el) => getComputedStyle(el).visibility !== 'hidden')
    .catch(() => false)
}

/**
 * Pulsa el primer botón de la barra superior cuyo texto empiece por `text`.
 * Preferir esto al import dinámico del store: el botón es lo que pulsa una
 * persona y no depende de qué instancia del módulo tenga la app.
 */
async function clickButton(page, text) {
  for (const handle of await page.$$('.topbar button')) {
    const label = ((await handle.evaluate((el) => el.textContent ?? '')) ?? '').trim()
    if (label.startsWith(text)) {
      await handle.click()
      return true
    }
  }
  return false
}

async function newPage(browser, url, seed) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  const errors = []
  const warns = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
    if (m.type() === 'warn') warns.push(m.text())
  })
  // seed: siembra localStorage ANTES de que arranque la app (el store la lee
  // al importar el módulo, así que después de goto ya sería tarde).
  if (seed) await page.evaluateOnNewDocument(seed)
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 180000 })
  return { page, errors, warns }
}

/**
 * Despliega la lista de fases si está plegada. Empieza plegada a propósito, así
 * que el arnés tiene que abrirla como cualquier persona antes de usar la lista.
 */
async function openSidePanel(page) {
  const collapsed = await page.$('.panel--left.panel--collapsed')
  if (collapsed) {
    await page.click('.panel--left .panel-toggle')
    await wait(300)
  }
  await page.waitForSelector('button.comp-item', { timeout: 60000 })
}

/**
 * Coloca el componente i: lo selecciona en la lista y clica en el centro de su
 * zona iluminada (el punto invisible `.mount-center` que pinta `MountZone`).
 */
async function place(page, i) {
  const items = await page.$$('button.comp-item')
  const name = await items[i].evaluate((el) => el.querySelector('.name')?.textContent ?? '')

  const progress = () => page.$eval('.progress-label', (el) => el.textContent.trim())
  const readCenter = () =>
    page
      .$eval('.mount-center', (el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })
      .catch(() => null)
  const isSelected = () =>
    page.$$eval(
      '.comp-item--active',
      (els, n) => els.some((el) => el.querySelector('.name')?.textContent === n),
      name,
    )

  const select = async () => {
    for (let n = 0; n < 2; n++) {
      await items[i].click()
      for (let t = 0; t < 12; t++) {
        await wait(250)
        if (await isSelected()) return true
      }
    }
    return false
  }

  if (!(await select())) return false

  let center = null
  for (let t = 0; t < 8 && !center; t++) {
    await wait(250)
    center = await readCenter()
  }
  if (!center) return false

  const before = await progress()
  for (const [dx, dy] of [[0, 0], [0, -20], [0, 20], [-20, 0], [20, 0], [-20, -20], [20, 20]]) {
    if (!(await isSelected()) && !(await select())) return false
    await page.mouse.click(center.x + dx, center.y + dy)
    await wait(280)
    if ((await progress()) !== before) {
      await wait(900)
      return true
    }
  }
  return false
}

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

/**
 * Antes de nada: en BASE_URL tiene que haber un simulador vivo. Si el servidor no
 * está, o está en otro puerto (Vite se pasa al siguiente en silencio cuando el
 * puerto está ocupado), todas las secciones fallarían con errores que parecen del
 * código. Se para con un mensaje claro en vez de con veinte fallos raros.
 */
async function requireServer() {
  try {
    const res = await fetch(BASE_URL)
    const html = await res.text()
    if (!res.ok || !html.includes('id="root"')) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    console.error(`No hay simulador en ${BASE_URL} (${e.message}).`)
    console.error(
      'Levanta `npm run dev -- --port 5199` y comprueba la línea «Local:» del log: ' +
        'si el puerto estaba ocupado, Vite se pasa a 5200 sin avisar.',
    )
    process.exit(1)
  }
}

await requireServer()

/**
 * Varias secciones mueven la partida llamando al store con un import dinámico
 * (`/src/store/useGameStore.ts`). Si se ha tocado `src/` con el servidor de
 * desarrollo levantado, HMR deja ese módulo con `?t=…` y el import devuelve una
 * COPIA distinta de la que usa la app: las acciones no llegan a la partida y el
 * arnés falla como si fuese un defecto del producto (§7, §8, §12 y §13).
 *
 * Esto lo detecta antes de correr nada: se mueve el store desde el import y se
 * comprueba que la app lo refleja en el DOM. Si no, se para con el motivo.
 */
async function requireSameStoreInstance() {
  const page = await browser.newPage()
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 180000 })
    await page.waitForSelector('button.mode-card', { timeout: 60000 })
    const cards = await page.$$('button.mode-card')
    await cards[0].click() // práctica
    await page.waitForSelector('.badge--stage', { timeout: 60000 })
    await wait(400)
    const antes = await page.$eval('.badge--stage', (el) => el.textContent.trim())
    await page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().skipStage()),
    )
    await wait(700)
    const despues = await page.$eval('.badge--stage', (el) => el.textContent.trim())
    if (antes === despues) {
      console.error(
        `El import dinámico del store NO es la misma instancia que la de la app (${antes} → ${despues}).`,
      )
      console.error(
        'Pasa al tocar `src/` con el servidor levantado: reinícialo antes de correr el arnés (HMR deja el módulo con ?t=…).',
      )
      process.exit(1)
    }
  } finally {
    await page.close()
  }
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
})

await requireSameStoreInstance()

/* ---------- 1. Modo calibración ---------- */
{
  const { page, errors } = await newPage(browser, `${BASE_URL}/?calibrate=1`)
  const panel = await page.waitForSelector('.calib', { timeout: 60000 }).catch(() => null)
  check('calibración: panel visible', !!panel)
  const slots = await page.$$('.calib__slots .calib__slot')
  check('calibración: 6 huecos', slots.length === 6, `${slots.length}`)

  // Assert on the store, not on a label: the armed slot already shows
  // "clic 1/1…" (with digits) before storing anything, so the old assertion
  // passed even if the click stored nothing.
  const readState = () =>
    page
      .$eval('.calib__json', (el) => JSON.parse(el.textContent ?? 'null'))
      .catch(() => null)
  // null = payload no leído (R3-TEST-POINTS-DEREF): el diagnóstico nunca debe
  // dar un número de puntos negativo, pero la aserción sigue fallando igual.
  const readPoints = (state) => {
    if (!state || !state.points || typeof state.points !== 'object') return null
    return Object.values(state.points).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0)
  }
  const fmtPoints = (n) => (n === null ? 'no leído' : String(n))

  await slots[0].click()
  await wait(300)
  const before = await readState()
  const nBefore = readPoints(before)

  // Like place(), scan candidate points until the stored count grows: start at
  // the canvas centre and try small offsets. Fail loudly if nothing is stored.
  const canvasBox = await (await page.$('canvas')).boundingBox()
  const cx = Math.round(canvasBox.x + canvasBox.width / 2)
  const cy = Math.round(canvasBox.y + canvasBox.height / 2)
  let after = null
  let nAfter = null
  for (const [dx, dy] of [[0, 0], [0, -20], [0, 20], [-20, 0], [20, 0], [-20, -20], [20, 20]]) {
    await page.mouse.click(cx + dx, cy + dy)
    await wait(400)
    after = await readState()
    nAfter = readPoints(after)
    if (nAfter !== null && (nBefore === null || nAfter > nBefore)) break
    after = null
  }
  check(
    'calibración: registra un punto',
    nBefore !== null && nAfter !== null && nAfter === nBefore + 1,
    `puntos antes ${fmtPoints(nBefore)}, después ${fmtPoints(nAfter)}; points=${JSON.stringify(after ? after.points : null)}`,
  )

  // The new point must be a real coordinate: exactly one, with 3 finite numbers.
  const added = after
    ? Object.entries(after.points).flatMap(([slot, arr]) => {
        const prev = (before && before.points && before.points[slot]) || []
        return prev.length < arr.length ? arr.slice(prev.length) : []
      })
    : []
  const okShape =
    added.length === 1 && added[0].length === 3 && added[0].every((v) => Number.isFinite(v))
  check('calibración: el punto nuevo es una coordenada válida', okShape, JSON.stringify(added))

  const saved = await page.evaluate(async () => {
    const res = await fetch('/__calibration', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ probe: true }),
    })
    return res.ok
  })
  check('calibración: endpoint de guardado', saved)
  check('calibración: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 2. Partida completa ---------- */
async function fullGame() {
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCard = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .catch(() => null)
  check('partida: menú de modos visible', !!menuCard)
  if (!menuCard) {
    check('partida: sin errores', errors.length === 0, errors.join(' | '))
    await page.close()
    return
  }
  await menuCard.click()
  await wait(3500)

  // La lista de fases empieza PLEGADA (decisión de producto): el arnés la
  // despliega como haría cualquier persona antes de usar sus botones.
  await openSidePanel(page)

  const placedCount = () => page.$$eval('.comp-item--placed', (els) => els.length)

  // Fase 1: identificar las 18 piezas
  for (let i = 0; i < IDENTIFY; i++) {
    await place(page, i)
  }
  check('partida: identificación completa', (await placedCount()) >= IDENTIFY, `${await placedCount()}`)

  // Fase 2: las 6 piezas de la placa
  for (let i = IDENTIFY; i < IDENTIFY + 6; i++) {
    await place(page, i)
  }

  // Fase 3: arrastrar un cable desde la barra inferior hasta su puerto
  const beforeDrag = await placedCount()
  let dragged = false
  const bar = await page.$('.connbar__item')
  if (bar) {
    const box = await bar.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await wait(300)
    await page.mouse.move(700, 300)
    await wait(300)
    const center = await page
      .$eval('.mount-center', (el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })
      .catch(() => null)
    if (center) await page.mouse.move(center.x, center.y)
    await wait(300)
    await page.mouse.up()
    await wait(900)
    dragged = (await placedCount()) > beforeDrag
  }
  const afterDrag = await placedCount()
  check(
    'partida: arrastrar desde la barra de cables',
    dragged && afterDrag >= IDENTIFY + 7,
    `${afterDrag}`,
  )

  // El resto, con clic y clic
  for (let i = 0; i < ITEMS; i++) {
    await place(page, i)
  }

  const progress = await page.$eval('.progress-label', (el) => el.textContent.trim())
  check(`partida: ${PLACEABLE}/${PLACEABLE} colocaciones`, progress === `${PLACEABLE}/${PLACEABLE}`, progress)
  const marked = await placedCount()
  check(`partida: ${PLACEABLE} piezas colocadas`, marked >= PLACEABLE, `${marked}`)
  check('partida: modal final', !!(await page.$('.overlay')))
  check('partida: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 3. Examen: guardia contra el doble clic en «Rendirse» ---------- */
async function examGiveUpGuard() {
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('examen: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }
  await menuCards[1].click() // la segunda tarjeta es «Modo examen» (ModeMenu)
  const topbar = await page.waitForSelector('.topbar', { timeout: 60000 }).catch(() => null)
  check('examen: barra superior visible', !!topbar)
  if (!topbar) {
    await page.close()
    return
  }
  await wait(500)
  check('examen: modo examen activo', !!(await page.$('.badge--exam')))

  const stageBadge = () => page.$eval('.badge--stage', (el) => el.textContent.trim())
  const scoreBadge = () =>
    page.$$eval('.topbar .badge', (els) =>
      els.map((el) => el.textContent ?? '').find((t) => t.startsWith('Puntos:')) ?? '',
    )
  const beforeStage = await stageBadge()
  const beforeScore = await scoreBadge()
  // Dos clics seguidos dentro de la ventana de 500 ms del guardia
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.topbar button')].find((b) =>
      b.textContent?.includes('Rendirse'),
    )
    if (!btn) return
    btn.click()
    btn.click()
  })
  await wait(500)
  const afterStage = await stageBadge()
  const afterScore = await scoreBadge()
  // Rendirse en la fase 1 sin piezas colocadas resta IDENTIFY piezas:
  // 100 − (100/PLACEABLE) × IDENTIFY, redondeado.
  const expectedScore = Math.round(100 - (100 / PLACEABLE) * IDENTIFY)
  check('examen: solo avanza una fase', beforeStage === '1. Identificación' && afterStage === '2. Placa base', `${beforeStage} → ${afterStage}`)
  check('examen: solo pierde una fase de puntos', afterScore === `Puntos: ${expectedScore}`, `${beforeScore || '—'} → ${afterScore} (esperado ${expectedScore})`)
  check('examen: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 4. ?board= desconocido: aviso y placa por defecto ---------- */
async function unknownBoardGuard() {
  // La placa activa se lee del <select> del calibrador (value={BOARD_ID} en
  // CalibrationPanel.tsx): determinista y sin depender de que exista el .glb.
  // Solo vale en ?calibrate=1, donde la placa activa nunca se sortea al azar.
  const activeBoardId = async (page) => {
    // El <select> aparece con el panel pero puede tardar más que el
    // waitForSelector de .calib (máquina lenta): esperar el propio select
    // antes de leerlo. Si nunca llega, el diagnóstico hace fallar el check.
    try {
      await page.waitForSelector('.calib__field select', { timeout: 60000 })
      return await page.$eval('.calib__field select', (el) => el.value)
    } catch {
      return '<select del calibrador no apareció en 60 s>'
    }
  }

  {
    const { page, errors, warns } = await newPage(browser, `${BASE_URL}/?calibrate=1&board=no-existe`)
    const panel = await page.waitForSelector('.calib', { timeout: 60000 }).catch(() => null)
    check('placa desconocida: panel de calibración visible', !!panel)
    check('placa desconocida: aviso en consola que nombra el id recibido', warns.some((t) => t.includes('no-existe')), warns.join(' | '))
    const id = await activeBoardId(page)
    check('placa desconocida: cae a la placa por defecto', id === 'motherboard-01', String(id))
    check('placa desconocida: sin errores', errors.length === 0, errors.join(' | '))
    await page.close()
  }

  {
    // Caso de control: el mismo selector con un id válido debe dar OTRO
    // resultado, para demostrar que la aserción discrimina de verdad.
    const { page, errors } = await newPage(browser, `${BASE_URL}/?calibrate=1&board=motherboard-02`)
    const panel = await page.waitForSelector('.calib', { timeout: 60000 }).catch(() => null)
    check('placa válida: panel de calibración visible', !!panel)
    const id = await activeBoardId(page)
    check('placa válida: se usa la placa pedida', id === 'motherboard-02', String(id))
    check('placa válida: sin errores', errors.length === 0, errors.join(' | '))
    await page.close()
  }
}

/* ---------- 5. Rotaciones corruptas en localStorage no blankan el panel ---------- */
async function rotationsGuard() {
  // Claves reales del código, no inventadas: pc-sim-rotations es ROTATIONS_KEY
  // (useCalibrationStore.ts) y «board:<id>» es el formato de ROTATION_TARGETS
  // (components.ts). Con ?board=motherboard-01 en calibración, la placa activa
  // es fija y el objetivo — y su clave — son deterministas.
  // El seed se serializa al navegador sin sus cierres: cada variante lleva
  // todos los valores como literales, sin ninguna variable libre.
  const seedCorrupt = () => {
    localStorage.setItem(
      'pc-sim-rotations',
      JSON.stringify({
        tab: 'rotations',
        rotations: { 'board:motherboard-01': 1 },
        selectedTarget: 'board:motherboard-01',
      }),
    )
  }
  const seedValid = () => {
    localStorage.setItem(
      'pc-sim-rotations',
      JSON.stringify({
        tab: 'rotations',
        rotations: { 'board:motherboard-01': [0.35, -1.2, 2.5] },
        selectedTarget: 'board:motherboard-01',
      }),
    )
  }

  {
    // Valor corrupto (un número donde toca un Vec3): antes de la guardia
    // llegaba al .map() y en blanco el panel entero.
    const { page, errors } = await newPage(browser, `${BASE_URL}/?calibrate=1&board=motherboard-01`, seedCorrupt)
    const panel = await page.waitForSelector('.rot-calc', { timeout: 60000 }).catch(() => null)
    check('rotaciones corruptas: el panel de rotaciones sigue ahí', !!panel)
    // «Cero spans» solo prueba algo cuando la lista ya está renderizada: antes
    // del render también habría cero y el control pasaría siempre.
    const rendered = await page
      .waitForFunction(
        () => document.querySelectorAll('.rot-calc__target').length >= 1,
        { timeout: 60000 },
      )
      .then(() => true)
      .catch(() => false)
    const touched = await page
      .$$eval('.rot-calc__target-value', (els) => els.length)
      .catch(() => -1)
    check(
      'rotaciones corruptas: el valor inválido no se muestra',
      rendered && touched === 0,
      rendered ? `${touched} span(s) de valor` : 'la lista de objetivos no llegó a renderizarse en 60 s',
    )
    check('rotaciones corruptas: sin errores', errors.length === 0, errors.join(' | '))
    await page.close()
  }

  {
    // Caso de control: una rotación bien guardada NO se puede perder — si la
    // guardia descartara valores legítimos, esto fallaría.
    const { page, errors } = await newPage(browser, `${BASE_URL}/?calibrate=1&board=motherboard-01`, seedValid)
    const panel = await page.waitForSelector('.rot-calc', { timeout: 60000 }).catch(() => null)
    check('rotaciones válidas: el panel de rotaciones sigue ahí', !!panel)
    const valueEl = await page
      .waitForSelector('.rot-calc__target--active .rot-calc__target-value', { timeout: 60000 })
      .catch(() => null)
    const value = valueEl
      ? await valueEl.evaluate((el) => el.textContent.trim())
      : '<el objetivo activo no apareció en 60 s>'
    check('rotaciones válidas: el valor guardado se muestra', value === '0.35, -1.2, 2.5', String(value))
    check('rotaciones válidas: sin errores', errors.length === 0, errors.join(' | '))
    await page.close()
  }
}
/* ---------- 6. ?board= desconocido FUERA de calibración: caída determinista ---------- */
async function unknownBoardNoCalibration() {
  // Fuera de calibración no hay <select> del calibrador: la placa activa solo
  // se ve en la petición de su .glb (boardModelUrl en boards.ts). Ese modelo
  // se pinta al montar StageBoard → BoardBase, y la placa NO está en la
  // bandeja de la identificación, así que la petición no ocurre hasta saltar
  // a la fase 2 con «Saltar fase →».
  const PLACAS = '/assets/models/placas/'

  /** ARRANCA en práctica y salta la identificación; devuelve las peticiones
   *  del .glb de la placa y el nivel (texto del badge) en que se quedó.
   *  El listener se cuelga tras goto pero antes de ningún clic: nada pide el
   *  modelo de la placa en la pantalla inicial. */
  const loadToBoardStage = async (url) => {
    const { page, errors } = await newPage(browser, url)
    const urls = []
    // La primera petición del .glb despierta la promesa: así se puede esperar
    // a que LLEGUE de verdad, en vez de dejar un sleep fijo de 2 s.
    let despertar
    const placaPedida = new Promise((resolve) => {
      despertar = resolve
    })
    page.on('request', (req) => {
      if (req.url().includes(PLACAS)) {
        urls.push(req.url())
        despertar()
      }
    })
    let detallePlaca = 'sin petición registrada'
    const menuCard = await page
      .waitForSelector('button.mode-card', { timeout: 60000 })
      .catch(() => null)
    if (!menuCard) {
      detallePlaca = 'el menú de modos no apareció en 60 s'
      return { page, errors, urls, level: null, detallePlaca }
    }
    await menuCard.click()
    const topbar = await page.waitForSelector('.topbar', { timeout: 60000 }).catch(() => null)
    if (!topbar) {
      detallePlaca = 'la barra superior no apareció en 60 s'
      return { page, errors, urls, level: null, detallePlaca }
    }
    // «Saltar fase →» (TopBar, solo en práctica): pasa a la fase de la placa.
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('.topbar button')].find((b) =>
        b.textContent?.includes('Saltar fase'),
      )
      if (btn) btn.click()
    })
    const level = await page
      .waitForFunction(
        () => document.querySelector('.badge--stage')?.textContent?.trim() === '2. Placa base',
        { timeout: 60000 },
      )
      .then(() => '2. Placa base')
      .catch(() => null)
    if (!level) {
      detallePlaca = 'el badge no llegó a «2. Placa base» en 60 s'
      return { page, errors, urls, level: null, detallePlaca }
    }
    const placaLlegó = await Promise.race([
      placaPedida.then(() => true),
      wait(60000).then(() => false),
    ])
    if (!placaLlegó) detallePlaca = 'la petición del .glb no llegó en 60 s tras el badge'
    return { page, errors, urls, level, detallePlaca: urls.length ? urls.map((u) => u.split(PLACAS)[1] ?? u).join(' | ') : detallePlaca }
  }

  // El nombre del archivo pedido es el id de la placa activa: tres cargas
  // frescas con el MISMO id desconocido deben pedir SIEMPRE la de por
  // defecto. Antes de la guardia el id era al azar (1 de 27 que las tres
  // cargas coincidan): esta aserción distingue el fix del comportamiento viejo.
  const seen = []
  for (let n = 1; n <= 3; n++) {
    const { page, errors, urls, level, detallePlaca } = await loadToBoardStage(`${BASE_URL}/?board=no-existe`)
    const names = urls.map((u) => u.split(PLACAS)[1] ?? u)
    seen.push(...names)
    check(`placa desconocida sin calibrar: carga ${n} llega a la fase de la placa`, level === '2. Placa base', String(level))
    check(`placa desconocida sin calibrar: carga ${n} pide el modelo de la placa`, urls.length >= 1, urls.length ? names.join(' | ') : detallePlaca)
    check(`placa desconocida sin calibrar: carga ${n} pide motherboard-01.glb`, urls.length >= 1 && urls.every((u) => u.endsWith(`${PLACAS}motherboard-01.glb`)), urls.length ? names.join(' | ') : detallePlaca)
    check(`placa desconocida sin calibrar: carga ${n} sin errores`, errors.length === 0, errors.join(' | '))
    await page.close()
  }
  check(
    'placa desconocida sin calibrar: las tres cargas pidieron lo mismo',
    seen.length >= 3 && seen.every((n) => n === 'motherboard-01.glb'),
    seen.join(' | '),
  )

  {
    // Control: con un id válido debe pedirse ESE modelo. Si el observable
    // fuera constante (p. ej. siempre la primera placa), esto fallaría.
    const { page, errors, urls, level, detallePlaca } = await loadToBoardStage(`${BASE_URL}/?board=motherboard-03`)
    const names = urls.map((u) => u.split(PLACAS)[1] ?? u)
    check('placa válida sin calibrar: llega a la fase de la placa', level === '2. Placa base', String(level))
    check('placa válida sin calibrar: pide motherboard-03.glb', urls.length >= 1 && urls.every((u) => u.endsWith(`${PLACAS}motherboard-03.glb`)), urls.length ? names.join(' | ') : detallePlaca)
    check('placa válida sin calibrar: sin errores', errors.length === 0, errors.join(' | '))
    await page.close()
  }
}

/* ---------- 7. Guardia de skipStage: solo práctica, durante el montaje ---------- */
async function skipStageGuard() {
  // La guardia vive en la ACCIÓN del store (useGameStore.ts), no en el botón:
  // TopBar oculta «Saltar fase» fuera de práctica (decisión 40), así que la UI
  // sola no puede probarla. Se importa por /src/… porque en el servidor de dev
  // esa URL resuelve a la MISMA instancia de useGameStore que usa la app.
  const callSkipStage = (page) =>
    page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().skipStage()),
    )
  const stageBadge = (page) =>
    page.$eval('.badge--stage', (el) => el.textContent.trim()).catch(() => '<sin badge de fase>')

  // Arranca en el modo cards[modeIndex] y espera la barra superior.
  const startMode = async (modeIndex, label) => {
    const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
    const cards = await page
      .waitForSelector('button.mode-card', { timeout: 60000 })
      .then(() => page.$$('button.mode-card'))
      .catch(() => [])
    check(`${label}: menú de modos visible`, cards.length >= 2, `${cards.length}`)
    if (cards.length < 2) {
      await page.close()
      return null
    }
    await cards[modeIndex].click()
    const topbar = await page.waitForSelector('.topbar', { timeout: 60000 }).catch(() => null)
    check(`${label}: barra superior visible`, !!topbar)
    if (!topbar) {
      await page.close()
      return null
    }
    await wait(500)
    return { page, errors }
  }

  // Control positivo: en PRÁCTICA la misma llamada del store SÍ avanza. Sin
  // esto, la aserción negativa pasaría en vacío si el import dinámico fallara.
  {
    const ctx = await startMode(0, 'skipStage práctica')
    if (ctx) {
      const before = await stageBadge(ctx.page)
      await callSkipStage(ctx.page)
      await wait(500)
      const after = await stageBadge(ctx.page)
      check(
        'skipStage práctica: la acción del store avanza una fase',
        before === '1. Identificación' && after === '2. Placa base',
        `${before} → ${after}`,
      )
      check('skipStage práctica: sin errores', ctx.errors.length === 0, ctx.errors.join(' | '))
      await ctx.page.close()
    }
  }

  // Caso negativo: en EXAMEN el guardia (mode !== 'practice') impide el salto
  // aunque se llame a la acción directamente.
  {
    const ctx = await startMode(1, 'skipStage examen')
    if (ctx) {
      // Decisión 40: el botón no existe en la barra fuera de práctica.
      const buttons = await ctx.page.$$eval('.topbar button', (els) =>
        els.map((el) => el.textContent?.trim() ?? ''),
      )
      check(
        'skipStage examen: «Saltar fase» no está en la barra',
        !buttons.some((t) => t.includes('Saltar fase')),
        buttons.join(' | '),
      )
      const before = await stageBadge(ctx.page)
      await callSkipStage(ctx.page)
      await wait(500)
      const after = await stageBadge(ctx.page)
      check(
        'skipStage examen: la acción real NO avanza la fase',
        before === '1. Identificación' && after === before,
        `${before} → ${after}`,
      )
      check('skipStage examen: sin errores', ctx.errors.length === 0, ctx.errors.join(' | '))
      await ctx.page.close()
    }
  }
}

/* ---------- 8. El fantasma del cable se ve al arrastrar por debajo ---------- */
async function dragGhostVisible() {
  // Fix 359c0f0: sin acotar la Y renderizada, el fantasma caía en el plano
  // vertical de arrastre, MUY por debajo del banco, y el banco opaco se
  // interponía entre cámara y fantasma: el cable parecía invisible mientras se
  // arrastraba por la mitad baja de la pantalla. La aserción es el SÍNTOMA que
  // ve el usuario (píxeles que cambian junto al cursor), no la fórmula:
  // reimplementar Math.max en el test pasaría aunque el renderer lo ignorara.
  const LOW_Y = 800 // sobre la barra de cables (816-884): con el bug, 0 px
  const MIN_PIXELS = 1000 // medido: 4706 px con el acotado y 0 px sin él (control negativo)
  /** Ruido tolerado entre dos capturas con el fantasma encendido (escena quieta). */
  const MAX_STATIC_PIXELS = 300
  const WIN = { x0: 0, y0: 60, x1: 1400, y1: 760 } // excluye statusbar--raised (765-804) y .connbar (816-884)

  // Decodifica las dos capturas DENTRO de la página y cuenta píxeles distintos
  // (umbral 12 por canal, como en la sonda que validó el fix).
  const diffCount = async (page, shotA) => {
    const shotB = await page.screenshot({ encoding: 'base64' })
    return page.evaluate(
      async (a, b, x0, y0, x1, y1) => {
        const load = async (b64) => {
          const img = new Image()
          img.src = 'data:image/png;base64,' + b64
          await img.decode()
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          return ctx.getImageData(0, 0, c.width, c.height)
        }
        const A = await load(a)
        const B = await load(b)
        let n = 0
        for (let y = y0; y < Math.min(y1, A.height); y++) {
          for (let x = x0; x < Math.min(x1, A.width); x++) {
            const i = (y * A.width + x) * 4
            if (
              Math.abs(A.data[i] - B.data[i]) > 12 ||
              Math.abs(A.data[i + 1] - B.data[i + 1]) > 12 ||
              Math.abs(A.data[i + 2] - B.data[i + 2]) > 12
            )
              n++
          }
        }
        return n
      },
      shotA,
      shotB,
      WIN.x0,
      WIN.y0,
      WIN.x1,
      WIN.y1,
    )
  }

  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('fantasma: menú de modos visible', menuCards.length >= 1, `${menuCards.length}`)
  if (menuCards.length < 1) {
    await page.close()
    return
  }
  await menuCards[0].click() // modo práctica: la barra de cables está en las dos fases 3
  const topbar = await page.waitForSelector('.topbar', { timeout: 60000 }).catch(() => null)
  check('fantasma: barra superior visible', !!topbar)
  if (!topbar) {
    await page.close()
    return
  }
  await wait(500)

  // A la fase de conectores por la vía barata (skipStage, práctica).
  const skip = () =>
    page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().skipStage()),
    )
  await skip()
  await wait(1200)
  await skip()
  await wait(3500)
  const stage = await page.$eval('.badge--stage', (el) => el.textContent.trim()).catch(() => '<sin badge>')
  check('fantasma: en la fase de conectores', stage === '3. Conectores', stage)

  // Higiene de la medición: en práctica las zonas de montaje PULSAN su opacidad
  // (MountZone, sin(elapsedTime·4)) y ensucian el diff con miles de píxeles
  // que no son el fantasma. El modo examen las oculta (decisión 14); la barra
  // de cables NO depende del modo (App.tsx: phase + stage.id), así que el
  // arrastre real con el ratón sigue igual. No se restaura: la página se cierra.
  // El aviso de fase se apaga a la vez (stageChangedAt: 0): su temporizador de
  // 2,8 s (StageBanner) podría dispararse DENTRO de la ventana de medida en una
  // máquina cargada y meter miles de píxeles, es decir, dar por buena una build
  // rota.
  await page.evaluate(() =>
    import('/src/store/useGameStore.ts').then((m) =>
      m.useGameStore.setState({ mode: 'exam', stageChangedAt: 0 }),
    ),
  )
  await wait(300)

  // Arrastre REAL desde la barra (pasa el umbral de 6 px de ConnectorBar) y
  // puntero ABAJO, donde el fantasma tapado era el síntoma del bug.
  const bar = await page.$('.connbar__item')
  check('fantasma: barra de cables visible', !!bar)
  if (!bar) {
    await page.close()
    return
  }
  const box = await bar.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await wait(300)
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 - 40)
  await wait(300)
  await page.mouse.move(700, LOW_Y)
  await wait(500)

  // Evidencia de apoyo (nunca la aserción): el arrastre sigue vivo.
  const dragging = await page.evaluate(() =>
    import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().dragging),
  )
  check('fantasma: el arrastre sigue activo abajo', dragging === true, String(dragging))

  // La prueba solo vale si el fantasma va LIBRE y por el plano vertical: con un
  // hueco imantado, Scene.tsx lo pega al puerto y el acotado de la Y (la rama
  // que se quiere cubrir) no se ejecuta; con un plano horizontal, esa línea ni
  // se lee. Sin estas dos aserciones la prueba podría dar `ok` cubriendo otra cosa.
  const branch = await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/useGameStore.ts')
    const { STAGES } = await import('/src/data/stages.ts')
    const s = useGameStore.getState()
    return { drop: STAGES[s.stageIndex].drop.kind, hover: s.hoverMountId }
  })
  check('fantasma: plano de arrastre vertical', branch.drop === 'vertical', branch.drop)
  check(
    'fantasma: el fantasma va libre, sin hueco imantado',
    branch.hover === null,
    String(branch.hover),
  )

  // La medición: captura CON fantasma, apaga SOLO el fantasma (dragging: false
  // mantiene selectedId, dragPos y las bandas de UI intactas) y vuelve a
  // capturar. Solo el cable puede explicar la diferencia.
  const withGhost = await page.screenshot({ encoding: 'base64' })
  await wait(400)
  // Control de escena estática, ANTES de apagar el fantasma: dos capturas con el
  // fantasma encendido deben salir casi idénticas. Si aquí aparecen cientos de
  // píxeles, la ventana está midiendo algo que se mueve solo (aviso de fase,
  // carga tardía del modelo, animación) y el recuento de abajo dejaría de
  // significar «esto es el fantasma».
  const staticNoise = await diffCount(page, withGhost)
  check(
    'fantasma: la escena está quieta entre dos capturas',
    staticNoise <= MAX_STATIC_PIXELS,
    `${staticNoise} px cambian con el fantasma encendido; límite ${MAX_STATIC_PIXELS}`,
  )
  await page.evaluate(() =>
    import('/src/store/useGameStore.ts').then((m) => m.useGameStore.setState({ dragging: false })),
  )
  await wait(400)
  const changed = await diffCount(page, withGhost)
  check(
    'fantasma: el cable se dibuja junto al cursor abajo',
    changed >= MIN_PIXELS,
    `${changed} px cambian en la ventana y ${WIN.y0}-${WIN.y1} (excluidas statusbar y connbar) frente a ${staticNoise} px de ruido estático; umbral ${MIN_PIXELS}: con el acotado se midieron 4706 px y sin él, 0`,
  )
  check('fantasma: sin errores', errors.length === 0, errors.join(' | '))

  await page.mouse.up().catch(() => {})
  await page.close()
}

/* ---------- 9. Paneles laterales plegables ---------- */
async function sidePanels() {
  // Por defecto la partida empieza con la lista de fases PLEGADA y la ficha del
  // componente DESPLEGADA, y el estado no se recuerda entre partidas (decisión
  // de producto): cada partida vuelve a este mismo punto de partida.
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('paneles: menú de modos visible', menuCards.length >= 1, `${menuCards.length}`)
  if (menuCards.length < 1) {
    await page.close()
    return
  }
  await menuCards[0].click() // práctica
  const topbar = await page.waitForSelector('.topbar', { timeout: 60000 }).catch(() => null)
  check('paneles: barra superior visible', !!topbar)
  if (!topbar) {
    await page.close()
    return
  }
  await wait(500)

  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.panel')].map((el) => ({
        cls: el.className,
        ancho: Math.round(el.getBoundingClientRect().width),
        expanded: el.querySelector('.panel-toggle')?.getAttribute('aria-expanded') ?? null,
        cuerpo: !!el.querySelector('.panel-body, .info-body, .info-empty'),
      })),
    )
  const find = (list, side) => list.find((p) => p.cls.includes(`panel--${side}`))

  const left = find(await read(), 'left')
  const right = find(await read(), 'right')
  check(
    'paneles: el izquierdo empieza plegado',
    !!left && left.cls.includes('panel--collapsed') && left.expanded === 'false',
    JSON.stringify(left),
  )
  check('paneles: plegado es una franja fina', !!left && left.ancho <= 60, `${left?.ancho} px`)
  check(
    'paneles: el derecho empieza desplegado',
    !!right && !right.cls.includes('panel--collapsed') && right.expanded === 'true',
    JSON.stringify(right),
  )
  check('paneles: el derecho desplegado muestra contenido', right?.cuerpo === true)
  check(
    'paneles: el izquierdo plegado no deja lista en el DOM',
    left?.cuerpo === false,
    String(left?.cuerpo),
  )

  await page.click('.panel--left .panel-toggle')
  await wait(300)
  const opened = find(await read(), 'left')
  check(
    'paneles: se despliega el izquierdo con su lista',
    !!opened && !opened.cls.includes('panel--collapsed') && opened.cuerpo === true && opened.ancho > 200,
    JSON.stringify(opened),
  )

  await page.click('.panel--right .panel-toggle')
  await wait(300)
  const closed = find(await read(), 'right')
  check(
    'paneles: se pliega el derecho',
    !!closed && closed.cls.includes('panel--collapsed') && closed.ancho <= 60,
    JSON.stringify(closed),
  )

  await page.click('.panel--left .panel-toggle')
  await page.click('.panel--right .panel-toggle')
  await wait(300)
  const back = await read()
  const leftBack = find(back, 'left')
  const rightBack = find(back, 'right')
  check(
    'paneles: los dos botones vuelven al estado inicial',
    leftBack?.cls.includes('panel--collapsed') === true &&
      rightBack?.cls.includes('panel--collapsed') === false,
    JSON.stringify([leftBack, rightBack]),
  )

  // El reparto por defecto es el de CADA partida, no una preferencia que se
  // arrastre. Ojo con el camino elegido: pasar por el menú DESMONTA los paneles
  // (App deja de pintarlos con `phase === 'menu'`), así que ese camino reinicia
  // el estado solo y no probaría nada. El camino que importa es «Reiniciar»,
  // que empieza una partida nueva sin desmontar nada.
  await page.click('.panel--left .panel-toggle') // despliega la lista
  await page.click('.panel--right .panel-toggle') // pliega la ficha
  await wait(300)
  const alReves = await read()
  check(
    'paneles: se pueden dejar al revés del reparto por defecto',
    find(alReves, 'left')?.cuerpo === true && find(alReves, 'right')?.cuerpo === false,
    JSON.stringify(alReves),
  )
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.topbar button')].find((b) =>
      b.textContent?.includes('Reiniciar'),
    )
    if (btn) btn.click()
  })
  await wait(1500)
  const nueva = await read()
  check(
    'paneles: reiniciar la partida vuelve al reparto por defecto',
    find(nueva, 'left')?.cls.includes('panel--collapsed') === true &&
      find(nueva, 'right')?.cls.includes('panel--collapsed') === false,
    JSON.stringify(nueva),
  )
  check('paneles: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 10. El examen no da ninguna ayuda ---------- */
async function examNoHelp() {
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('examen sin ayudas: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }
  await menuCards[1].click() // examen
  const topbar = await page.waitForSelector('.topbar', { timeout: 60000 }).catch(() => null)
  check('examen sin ayudas: barra superior visible', !!topbar)
  if (!topbar) {
    await page.close()
    return
  }
  await wait(1500)

  // 1) Nada de paneles: ni la lista (el nombre de cada pieza) ni la ficha
  //    (la explicación). Los dos son la respuesta.
  check('examen sin ayudas: no hay panel izquierdo', !(await page.$('.panel--left')))
  check('examen sin ayudas: no hay ficha del componente', !(await page.$('.panel--right')))
  check('examen sin ayudas: no hay lista de piezas', !(await page.$('.comp-item')))
  // La leyenda de controles y el aviso de la barra de estado NO son la
  // respuesta, así que se quedan (decisión de producto).
  check('examen sin ayudas: la leyenda de controles se ve', await isVisible(page, '.help__card'))
  check('examen sin ayudas: el botón de la leyenda se ve', await isVisible(page, '.help__toggle'))

  // 2) Nada de imán: en examen el fantasma sigue al puntero aunque esté sobre
  //    el hueco correcto. Se comprueba sobre el módulo que usa el renderer
  //    (`src/three/dragGhost.ts`), no sobre una copia de su lógica.
  const snap = await page.evaluate(async () => {
    const { ghostSnaps, ghostPosition } = await import('/src/three/dragGhost.ts')
    const { MOUNTS_BY_STAGE, COMPONENT_BY_ID } = await import('/src/data/components.ts')
    const { STAGES } = await import('/src/data/stages.ts')
    const board = MOUNTS_BY_STAGE.board[0]
    const stage = STAGES.find((s) => s.id === 'board')
    const dragging = COMPONENT_BY_ID[Object.keys(COMPONENT_BY_ID)[0]]
    const dragPos = [1.5, 1.5]
    return {
      practicaConHueco: ghostSnaps('practice', board.id),
      practicaSinHueco: ghostSnaps('practice', null),
      examenConHueco: ghostSnaps('exam', board.id),
      posPractica: ghostPosition(stage, dragPos, 'practice', board.id, false),
      posExamen: ghostPosition(stage, dragPos, 'exam', board.id, false),
      hueco: board.position,
      puntero: [dragPos[0], stage.drop.y + 0.08, dragPos[1]],
      existe: !!dragging,
    }
  })
  check('examen sin ayudas: en práctica el imán existe', snap.practicaConHueco === true)
  check('examen sin ayudas: sin hueco no hay imán ni en práctica', snap.practicaSinHueco === false)
  check('examen sin ayudas: en examen el imán NO existe', snap.examenConHueco === false)
  check(
    'examen sin ayudas: en práctica el fantasma se pega al hueco',
    JSON.stringify(snap.posPractica) ===
      JSON.stringify([snap.hueco[0], snap.hueco[1] + 0.05, snap.hueco[2]]),
    `${JSON.stringify(snap.posPractica)} frente al hueco ${JSON.stringify(snap.hueco)}`,
  )
  check(
    'examen sin ayudas: en examen el fantasma sigue al puntero',
    JSON.stringify(snap.posExamen) === JSON.stringify(snap.puntero),
    `${JSON.stringify(snap.posExamen)} vs puntero ${JSON.stringify(snap.puntero)}`,
  )

  // La comprobación anterior solo vale si puede fallar: con la leyenda
  // recordada como oculta, la tarjeta NO debe verse (y el botón sí, que es como
  // se vuelve a abrir). Sin este caso, un `isVisible` que devolviera siempre
  // `true` pasaría igual.
  {
    const oculta = await newPage(browser, `${BASE_URL}/?board=motherboard-01`, () =>
      localStorage.setItem('pc-sim-help', 'hidden'),
    )
    await oculta.page.waitForSelector('button.mode-card', { timeout: 60000 })
    const cards = await oculta.page.$$('button.mode-card')
    if (cards.length >= 2) {
      await cards[1].click()
      await oculta.page.waitForSelector('.topbar', { timeout: 60000 })
      await wait(800)
      check(
        'examen sin ayudas: con la leyenda oculta, la tarjeta no se ve',
        !(await isVisible(oculta.page, '.help__card')),
      )
      check(
        'examen sin ayudas: con la leyenda oculta, el botón sigue viéndose',
        await isVisible(oculta.page, '.help__toggle'),
      )
    } else {
      check('examen sin ayudas: la leyenda oculta arranca', false, `${cards.length} tarjetas`)
    }
    check(
      'examen sin ayudas: leyenda oculta sin errores',
      oculta.errors.length === 0,
      oculta.errors.join(' | '),
    )
    await oculta.page.close()
  }

  check('examen sin ayudas: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 11. La mesa nunca apila dos piezas ---------- */
async function traySeparation() {
  // Dos piezas se solapan si su separación en LOS DOS ejes es menor que su
  // huella. Ninguna pieza dibujada supera 0,75 u en ningún eje (los modelos se
  // normalizan a `def.size` y luego se escalan para no pasar de 0,75; los cables
  // procedurales son más pequeños), así que basta con que algún eje separe 0,75.
  // El desplazamiento aleatorio se deriva de la rejilla para que eso se cumpla
  // siempre: antes era ±0,4 fijo y dos vecinas podían quedar a 0,1 u.
  const SPAN = 0.75
  const RUNS = 200
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menu = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .catch(() => null)
  check('mesa: menú de modos visible (sonda de datos)', !!menu)
  if (!menu) {
    await page.close()
    return
  }

  const result = await page.evaluate(
    async (runs) => {
      const { COMPONENTS_BY_STAGE, shuffleLayout } = await import('/src/data/components.ts')
      const out = {}
      for (const stage of ['identify', 'board', 'ports', 'peripherals']) {
        const defs = COMPONENTS_BY_STAGE[stage]
        const at = (d) => (stage === 'identify' ? d.identifyPos : d.trayPos)
        let worst = Infinity
        let bad = 0
        let worstCol = Infinity
        let malaCol = 0
        for (let run = 0; run < runs; run++) {
          shuffleLayout()
          for (let i = 0; i < defs.length; i++) {
            for (let j = i + 1; j < defs.length; j++) {
              const a = at(defs[i])
              const b = at(defs[j])
              const dx = Math.abs(a[0] - b[0])
              const dz = Math.abs(a[1] - b[1])
              const sep = Math.max(dx, dz)
              if (sep < worst) worst = sep
              if (sep < 0.75) bad++
              // Misma «columna visual»: la cámara de la fase 1 mira en oblicuo, así
              // que dos piezas con la misma X se dibujan una detrás de otra. Si
              // además quedan cerca en profundidad, parecen estar en el mismo
              // sitio (es lo que se reportó con los tres jacks y el USB-C, que son
              // los más pequeños). El suelo de 1,3 u son ~110 px en pantalla;
              // con la rejilla vieja (4 filas) eran 0,9 u (~71 px).
              if (dx < 0.7) {
                if (dz < worstCol) worstCol = dz
                if (dz < 1.3) malaCol++
              }
            }
          }
        }
        out[stage] = {
          piezas: defs.length,
          peor: +worst.toFixed(3),
          solapados: bad,
          peorColumna: Number.isFinite(worstCol) ? +worstCol.toFixed(3) : null,
          columnaCorta: malaCol,
        }
      }
      return out
    },
    RUNS,
  )

  for (const stage of ['identify', 'board', 'ports', 'peripherals']) {
    const r = result[stage]
    check(
      `mesa: ninguna pieza se solapa en «${stage}» (${RUNS} barajados)`,
      r.solapados === 0 && r.peor >= SPAN,
      `${r.piezas} piezas, separación mínima ${r.peor} u (mínimo ${SPAN}) y ${r.solapados} pares por debajo`,
    )
  }
  // Además de no solaparse, en la fase 1 (donde están TODAS las piezas a la vez)
  // ninguna debe esconderse detrás de otra en la misma columna visual.
  const id = result.identify
  check(
    'mesa: en la fase 1 ninguna pieza se esconde en la misma columna visual',
    id.columnaCorta === 0 && id.peorColumna >= 1.3,
    `misma columna: separación mínima en profundidad ${id.peorColumna} u (mínimo 1.3) y ${id.columnaCorta} pares por debajo`,
  )
  // La identificación es la fase que se ve entera sobre la mesa y la que se
  // reportó con las clavijas de audio encima unas de otras. Esta comprobación no
  // es un invariante de comportamiento sino un **suelo de diseño**: fija que la
  // rejilla de esa fase siga dejando más aire del mínimo (0,9 en vez de 0,75),
  // que es la regresión que provocó el solape cuando la rejilla se estrechó.
  check(
    'mesa: la identificación mantiene su suelo de diseño (0,9 u)',
    result.identify.peor >= 0.9,
    `separación mínima ${result.identify.peor} u (suelo de diseño 0,9; mínimo duro 0,75)`,
  )

  check('mesa: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 12. En examen se sigue colocando (y fallar cuesta puntos) ---------- */
async function examDrag() {
  // El examen se juega arrastrando las piezas de la mesa, porque la lista (donde
  // se puede pulsar un nombre) ya no existe. Esta sección ejerce ese gesto de
  // verdad, con el ratón, y comprueba las dos consecuencias visibles: el puerto
  // correcto coloca el cable sin coste, y soltar en un puerto que no le
  // corresponde resta puntos.
  //
  // El fallo se prueba con el cable señuelo (USB-C), que no encaja en ningún
  // puerto: así el resultado no depende de lo apretados que estén los puertos en
  // la chapa (los snapRadius miden entre 0,072 y 0,198 y hay puertos a menos de
  // un snapRadius unos de otros, así que apuntar un fallo con un cable normal no
  // es determinista).
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('examen arrastre: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }
  await menuCards[0].click() // empieza en práctica: hace falta para ver los puertos
  const topbar = await page.waitForSelector('.topbar', { timeout: 60000 }).catch(() => null)
  check('examen arrastre: barra superior visible', !!topbar)
  if (!topbar) {
    await page.close()
    return
  }
  await wait(500)

  const skip = () =>
    page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().skipStage()),
    )
  const reset = () =>
    page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().reset()),
    )

  const names = () => page.$$eval('.connbar__item', (els) => els.map((e) => e.textContent.trim()))
  const barItem = async (i) => (await page.$$('.connbar__item'))[i]
  const score = () =>
    page.$$eval('.topbar .badge', (els) =>
      els.map((el) => el.textContent ?? '').find((t) => t.startsWith('Puntos:')) ?? '',
    )
  const store = () =>
    page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => {
        const s = m.useGameStore.getState()
        return { errors: s.errors, placed: s.placed, hover: s.hoverMountId }
      }),
    )
  const scoreNumber = (text) => Number(text.replace(/\D/g, ''))
  const status = () =>
    page.$eval('.statusbar span:last-child', (el) => el.textContent.trim()).catch(() => '')
  /** Primer cable de la barra cuyo texto contenga `name` (los índices cambian
   *  cuando un cable ya colocado sale de la barra). */
  const barItemByName = async (name) => {
    for (const item of await page.$$('.connbar__item')) {
      const text = ((await item.evaluate((el) => el.textContent)) ?? '').trim()
      if (text.includes(name)) return item
    }
    return null
  }

  // Arrastra el cable de la posición i de la barra hasta un punto de la pantalla.
  const dragTo = async (i, point) => {
    const item = await barItem(i)
    if (!item) return { ok: false, why: `no hay cable en la posición ${i}` }
    const box = await item.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await wait(250)
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 - 40)
    await wait(250)
    await page.mouse.move(point.x, point.y)
    await wait(400)
    const hover = (await store()).hover
    // Lo que dice la barra de estado mientras el puntero está encima del hueco:
    // en examen no puede revelar cuál es.
    const estado = await status()
    await page.mouse.up()
    await wait(700)
    return { ok: true, hover, estado }
  }

  // El nombre del cable señuelo, tal y como lo llama el catálogo (no se escribe a
  // mano: si cambia el nombre, la prueba encuentra el nuevo).
  const decoy = await page.evaluate(() =>
    import('/src/data/components.ts').then((m) => {
      const def = m.COMPONENTS_BY_STAGE.ports.find((c) => c.decoy)
      return def ? { id: def.id, name: def.name, mountId: def.mountId ?? null } : null
    }),
  )
  check(
    'examen arrastre: el catálogo tiene un cable señuelo sin hueco',
    !!decoy && decoy.mountId === null,
    JSON.stringify(decoy),
  )

  await skip()
  await wait(1200)
  await skip()
  await wait(3500)
  const stage = await page.$eval('.badge--stage', (el) => el.textContent.trim()).catch(() => '<sin>')
  check('examen arrastre: en la fase de conectores', stage === '3. Conectores', stage)
  if (stage !== '3. Conectores') {
    // Sin la fase de conectores no hay barra ni puertos que medir y seguir daría un
    // error de tipo que tumba el arnés entero. Casi siempre es que el import
    // dinámico del store no es la misma instancia que la de la app por HMR
    // (reinicia el servidor de desarrollo).
    await page.close()
    return
  }

  const labels = await names()
  check(
    'examen arrastre: la barra de cables tiene al menos dos cables',
    labels.length >= 2,
    `${labels.length}`,
  )
  check(
    'examen arrastre: el cable señuelo está en la barra',
    !!decoy && labels.includes(decoy.name),
    `${decoy?.name} entre ${labels.length} cables`,
  )
  const iDecoy = labels.indexOf(decoy?.name ?? '')
  const i0 = labels.findIndex((n) => n !== decoy?.name)
  check(
    'examen arrastre: hay un cable normal y uno señuelo',
    iDecoy >= 0 && i0 >= 0 && i0 !== iDecoy,
    `señuelo en ${iDecoy}, normal en ${i0}`,
  )

  // Las zonas iluminadas solo existen en práctica y solo para los huecos del
  // cable seleccionado, así que son la forma exacta de saber dónde cae un puerto
  // en la pantalla. Se lee aquí y se usa luego en examen: al cambiar de modo no
  // cambian ni el escenario, ni los puertos, ni la cámara (y si cambiaran, la
  // colocación de abajo fallaría sola).
  const probePort = async () => {
    const item = await barItem(i0)
    const box = await item.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await wait(250)
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 - 40)
    await wait(400)
    const point = await page
      .$eval('.mount-center', (el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })
      .catch(() => null)
    // Suelta al aire. Puede colocar algo (en la chapa los puertos están muy
    // juntos), por eso la partida se reinicia justo después.
    await page.mouse.move(1200, 120)
    await wait(250)
    await page.mouse.up()
    await wait(600)
    return point
  }

  const port = await probePort()
  check('examen arrastre: el puerto del cable normal está en pantalla', !!port)
  if (!port) {
    await page.close()
    return
  }

  // Antes de examen: la misma suelta con el señuelo, en práctica, no cuenta
  // ningún fallo. Es la otra mitad de la regla («solo examen»).
  const practiceBefore = await store()
  const practiceDrop = await dragTo(iDecoy, port)
  const practiceAfter = await store()
  check('examen arrastre: el señuelo llegó a soltarse en práctica', practiceDrop.ok)
  check(
    'examen arrastre: en práctica soltar mal no cuenta fallo',
    practiceAfter.errors === practiceBefore.errors,
    `${practiceBefore.errors} → ${practiceAfter.errors}`,
  )
  check(
    'examen arrastre: el señuelo no coloca nada ni en práctica',
    Object.keys(practiceAfter.placed).length === Object.keys(practiceBefore.placed).length,
    `${Object.keys(practiceBefore.placed).length} → ${Object.keys(practiceAfter.placed).length}`,
  )

  // Partida limpia y modo examen (los puertos y la cámara no cambian, así que las
  // coordenadas de arriba siguen valiendo).
  await reset()
  await wait(1200)
  await skip()
  await wait(1200)
  await skip()
  await wait(3500)
  await page.evaluate(() =>
    import('/src/store/useGameStore.ts').then((m) =>
      m.useGameStore.setState({ mode: 'exam', stageChangedAt: 0 }),
    ),
  )
  await wait(500)
  check('examen arrastre: el examen está activo', !!(await page.$('.badge--exam')))
  check('examen arrastre: sin paneles laterales', !(await page.$('.panel--left')))

  const before = await store()
  const beforeScore = await score()
  check(
    'examen arrastre: la partida limpia empieza sin colocaciones ni fallos',
    Object.keys(before.placed).length === 0 && before.errors === 0,
    `${Object.keys(before.placed).length} colocadas, ${before.errors} fallos`,
  )

  // 1) El señuelo, en examen, sobre un puerto de verdad: hueco equivocado.
  const wrongDrop = await dragTo(iDecoy, port)
  const afterWrong = await store()
  const afterWrongScore = await score()
  check('examen arrastre: el arrastre equivocado llegó a soltarse', wrongDrop.ok, wrongDrop.why ?? '')
  check(
    'examen arrastre: el puerto equivocado no coloca nada',
    Object.keys(afterWrong.placed).length === 0,
    `${Object.keys(afterWrong.placed).length} colocadas`,
  )
  check(
    'examen arrastre: el puerto equivocado cuenta un fallo en examen',
    afterWrong.errors === 1,
    `${before.errors} → ${afterWrong.errors}`,
  )
  check(
    'examen arrastre: el fallo resta puntos',
    scoreNumber(afterWrongScore) < scoreNumber(beforeScore),
    `${beforeScore} → ${afterWrongScore}`,
  )

  // 2) El cable normal, en examen, sobre su propio puerto: coloca y no cuesta.
  const goodDrop = await dragTo(i0, port)
  const afterGood = await store()
  const afterGoodScore = await score()
  check('examen arrastre: el arrastre correcto llegó a soltarse', goodDrop.ok, goodDrop.why ?? '')
  check(
    'examen arrastre: el puerto correcto coloca el cable',
    Object.keys(afterGood.placed).length === 1,
    `${Object.keys(afterWrong.placed).length} → ${Object.keys(afterGood.placed).length}`,
  )
  check(
    'examen arrastre: el acierto no cuenta ningún fallo',
    afterGood.errors === afterWrong.errors,
    `${afterWrong.errors} → ${afterGood.errors}`,
  )
  check(
    'examen arrastre: el acierto no cuesta puntos',
    afterGoodScore === afterWrongScore,
    `${afterWrongScore} → ${afterGoodScore}`,
  )

  // 3) La barra de estado no da pistas en examen: ni el hueco compatible al pasar
  //    por encima, ni el nombre de la pieza al seleccionarla (decisión de la
  //    persona usuaria).
  check(
    'examen arrastre: la barra no revela el hueco al pasar por encima',
    goodDrop.ok && !/Suelta aquí/.test(goodDrop.estado ?? ''),
    `«${goodDrop.estado ?? ''}»`,
  )
  const decoyItem = await barItemByName(decoy.name)
  check('examen arrastre: el señuelo sigue en la barra para seleccionarlo', !!decoyItem)
  if (decoyItem) {
    await decoyItem.click()
    await wait(400)
    const estadoSeleccion = await status()
    check(
      'examen arrastre: la barra no nombra la pieza seleccionada',
      estadoSeleccion.length > 0 && !estadoSeleccion.includes(decoy.name),
      `«${estadoSeleccion}» no debe contener «${decoy.name}»`,
    )
  }
  check('examen arrastre: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 13. El arrastre con el dedo (y un gesto que el navegador cancela) ---------- */
async function touchDrag() {
  // Dos cosas que no se habían probado nunca: el arrastre con un dedo (hasta
  // ahora el arnés solo usaba `page.mouse`) y un gesto que el navegador cancela
  // a mitad (desplazamiento, zoom, gesto del sistema). Sin atender el
  // `pointercancel`, la pieza se queda colgada del cursor y el arrastre no
  // termina nunca: solo el Esc la suelta.
  //
  // Se arrastra desde la barra de cables porque es un elemento del DOM con
  // coordenadas estables: no hace falta proyectar una malla 3D para saber dónde
  // hay que soltar.
  //
  // El gesto se emula por CDP (`Input.dispatchTouchEvent`) y no con
  // `page.touchscreen`, que no puede emitir la cancelación.
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  await page.setViewport({ width: 1400, height: 900, hasTouch: true })
  const client = await page.createCDPSession()

  const dispatch = (type, points) =>
    client.send('Input.dispatchTouchEvent', { type, touchPoints: points })
  const fingerDown = (p) => dispatch('touchStart', [{ x: p.x, y: p.y }])
  const fingerMove = (p) => dispatch('touchMove', [{ x: p.x, y: p.y }])
  const fingerUp = () => dispatch('touchEnd', [])
  const fingerCancel = () => dispatch('touchCancel', [])

  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('táctil: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }
  await menuCards[0].click() // práctica: las zonas iluminadas dicen dónde cae el puerto
  await page.waitForSelector('.topbar', { timeout: 60000 })
  await wait(500)

  const skip = () =>
    page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().skipStage()),
    )
  const progress = () =>
    page.$eval('.progress-label', (el) => el.textContent.trim()).catch(() => '')
  const status = () =>
    page.$eval('.statusbar span:last-child', (el) => el.textContent.trim()).catch(() => '')
  const store = () =>
    page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => {
        const s = m.useGameStore.getState()
        return { dragging: s.dragging, attempts: s.attempts, placed: Object.keys(s.placed).length }
      }),
    )

  await skip()
  await wait(1200)
  await skip()
  await wait(3500)
  const stage = await page.$eval('.badge--stage', (el) => el.textContent.trim()).catch(() => '<sin>')
  check('táctil: en la fase de conectores', stage === '3. Conectores', stage)

  // El gesto tiene que ser del juego también de forma PREVENTIVA, no solo
  // reaccionar al `pointercancel` una vez el navegador ya se lo ha quedado. Se
  // mira el estilo COMPUTADO y no la hoja de estilos: `OrbitControls`
  // (three-stdlib) escribe un `touch-action` en línea sobre el canvas al
  // desmontarse y el estilo en línea gana a una clase, así que la regla estaba
  // puesta pero era inerte (defecto real encontrado por la verificación
  // independiente).
  const gestureOwner = (selector) =>
    page.$eval(selector, (el) => getComputedStyle(el).touchAction).catch(() => null)
  const canvasTouch = await gestureOwner('.canvas-host canvas')
  check(
    'táctil: el lienzo no deja el gesto al navegador',
    canvasTouch === 'none',
    `touch-action: ${canvasTouch}`,
  )
  const barTouch = await gestureOwner('.connbar__item')
  check(
    'táctil: la barra de cables tampoco deja el gesto',
    barTouch === 'none',
    `touch-action: ${barTouch}`,
  )

  // Elige el primer cable de la barra (un clic normal, que solo selecciona) para
  // que se iluminen sus puertos y poder leer en pantalla dónde cae uno.
  const pickCableAndPort = async () => {
    const item = (await page.$$('.connbar__item'))[0]
    if (!item) return null
    await item.click()
    await wait(400)
    const box = await item.boundingBox()
    const port = await page
      .$eval('.mount-center', (el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })
      .catch(() => null)
    if (!box || !port) return null
    return { bar: { x: box.x + box.width / 2, y: box.y + box.height / 2 }, port }
  }

  // Arrastra con el dedo desde la barra hasta el puerto y termina como se pida.
  const dragWithFinger = async (first, finish) => {
    await fingerDown(first.bar)
    await wait(150)
    // La barra solo empieza el arrastre cuando el puntero se mueve de verdad.
    await fingerMove({ x: first.bar.x + 14, y: first.bar.y - 14 })
    await wait(250)
    const started = (await store()).dragging
    await fingerMove(first.port)
    await wait(300)
    await finish()
    await wait(500)
    return started
  }

  // 1) Control positivo: con el dedo, el cable se coloca. Sin esto, la prueba de
  //    la cancelación pasaría en vacío (si el arrastre táctil no funcionara no
  //    habría nada que cancelar).
  const first = await pickCableAndPort()
  check('táctil: hay un cable y un puerto en pantalla', !!first)
  if (!first) {
    await page.close()
    return
  }
  const beforeTouch = { progress: await progress(), ...(await store()) }
  const startedTouch = await dragWithFinger(first, fingerUp)
  check('táctil: el dedo empieza el arrastre', startedTouch === true)
  const afterTouch = { progress: await progress(), ...(await store()) }
  check(
    'táctil: el dedo coloca el cable',
    afterTouch.placed === beforeTouch.placed + 1,
    `${beforeTouch.placed} → ${afterTouch.placed} colocadas`,
  )
  check(
    'táctil: el progreso avanza con el dedo',
    afterTouch.progress !== beforeTouch.progress,
    `${beforeTouch.progress} → ${afterTouch.progress}`,
  )

  // 2) El gesto cancelado: el navegador se queda con el dedo y el arrastre tiene
  //    que soltarse sin colocar la pieza y sin contarlo como una suelta.
  const second = await pickCableAndPort()
  check('táctil: hay un segundo cable para el caso cancelado', !!second)
  if (second) {
    const beforeCancel = { progress: await progress(), status: await status(), ...(await store()) }
    const startedCancel = await dragWithFinger(second, fingerCancel)
    const afterCancel = { progress: await progress(), status: await status(), ...(await store()) }
    check('táctil: el dedo vuelve a empezar el arrastre', startedCancel === true)
    check(
      'táctil: el gesto cancelado suelta la pieza (no se queda colgada)',
      afterCancel.dragging === false,
      `dragging=${afterCancel.dragging}`,
    )
    check(
      'táctil: el gesto cancelado no coloca nada',
      afterCancel.placed === beforeCancel.placed,
      `${beforeCancel.placed} → ${afterCancel.placed} colocadas`,
    )
    check(
      'táctil: el gesto cancelado no cuenta como intento',
      afterCancel.attempts === beforeCancel.attempts,
      `${beforeCancel.attempts} → ${afterCancel.attempts}`,
    )
    check(
      'táctil: el progreso no se mueve al cancelar',
      afterCancel.progress === beforeCancel.progress,
      `${beforeCancel.progress} → ${afterCancel.progress}`,
    )
    check(
      'táctil: al cancelar, la barra de estado deja de arrastrar',
      !/Suelta aquí|Lleva la pieza/.test(afterCancel.status),
      `«${beforeCancel.status}» → «${afterCancel.status}»`,
    )
  }

  check('táctil: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 14. El resumen del examen dice qué se falló y qué quedó sin colocar ---------- */
async function examSummary() {
  // El resumen se construye con datos que antes no existían (`misses`, `unplaced`),
  // así que la prueba ejerce el camino real: un fallo de verdad y dos «Rendirse»
  // de verdad, y luego mira la tarjeta final como la mira el alumnado.
  //
  //  // Lo que fija: una fila por fallo, que la fila nombra la pieza arrastrada, que
  // el sitio nombrado es un puerto real de la fase, que la pieza que va ahí no es
  // la que se arrastró, y que el número de filas sin colocar es el mismo que el
  // descuento. NO fija la identidad exacta del puerto (eso lo decide el radio de
  // error del store, y apuntarlo con precisión no es determinista en la chapa) ni
  // que el resumen sea exclusivo del examen: en práctica no se puede fallar ni
  // rendirse, así que esa guarda no es observable desde la interfaz.
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('resumen examen: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }
  await menuCards[0].click() // práctica: las zonas iluminadas dicen dónde cae el puerto
  await page.waitForSelector('.topbar', { timeout: 60000 })
  await wait(500)

  // El catálogo se lee del módulo (datos estáticos, no del store), pero si esa
  // lectura falla —pasa si el servidor se muere a mitad— la sección falla en vez
  // de tumbar todo el arnés.
  const catalog = async () => {
    try {
      return await page.evaluate(() =>
        import('/src/data/components.ts').then((m) => {
          const decoyDef = m.COMPONENTS_BY_STAGE.ports.find((c) => c.decoy)
          return {
            decoy: decoyDef ? { name: m.IDENTIFY_LABEL[decoyDef.kind] } : null,
            portLabels: m.MOUNTS_BY_STAGE.ports.map((mo) => mo.label),
          }
        }),
      )
    } catch (e) {
      return { decoy: null, portLabels: [], error: e.message }
    }
  }
  const labels = () => page.$$eval('.connbar__item', (els) => els.map((e) => e.textContent.trim()))
  const rowsOf = (selector) =>
    page.$$eval(selector, (els) =>
      els.map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()),
    )

  // Arrastra el cable de la barra en la posición `index` hasta un punto de la
  // pantalla (mismo gesto que §12).
  const dragTo = async (index, point) => {
    const item = (await page.$$('.connbar__item'))[index]
    if (!item) return false
    const box = await item.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await wait(250)
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 - 40)
    await wait(250)
    await page.mouse.move(point.x, point.y)
    await wait(400)
    await page.mouse.up()
    await wait(700)
    return true
  }

  const cat = await catalog()
  check(
    'resumen examen: el catálogo tiene un cable señuelo',
    !!cat.decoy,
    cat.error ?? 'sin señuelo en el catálogo',
  )
  if (!cat.decoy) {
    await page.close()
    return
  }

  // 1) A los conectores se llega pulsando «Saltar fase», como cualquiera.
  check('resumen examen: se puede saltar de fase', await clickButton(page, 'Saltar fase'))
  await wait(1500)
  check('resumen examen: se puede saltar otra vez', await clickButton(page, 'Saltar fase'))
  await wait(3500)
  const stage = await page.$eval('.badge--stage', (el) => el.textContent.trim()).catch(() => '<sin>')
  check('resumen examen: en la fase de conectores', stage === '3. Conectores', stage)

  // 1) Se lee dónde cae un puerto con un cable NORMAL seleccionado (las zonas
  //    iluminadas solo existen en práctica y solo para huecos que encajan), y se
  //    suelta al aire: en la chapa los puertos están tan juntos que soltar «lejos»
  //    puede colocar algo, y la partida se reinicia justo después.
  const names = await labels()
  const iDecoy = names.findIndex((n) => n === cat.decoy?.name)
  const iNormal = names.findIndex((n) => n !== cat.decoy?.name)
  check(
    'resumen examen: hay un cable normal y uno señuelo',
    iDecoy >= 0 && iNormal >= 0 && iDecoy !== iNormal,
    `señuelo en ${iDecoy}, normal en ${iNormal}`,
  )
  if (iDecoy < 0 || iNormal < 0) {
    await page.close()
    return
  }
  const item = (await page.$$('.connbar__item'))[iNormal]
  const box = await item.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await wait(250)
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 - 40)
  await wait(400)
  const port = await page
    .$eval('.mount-center', (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    .catch(() => null)
  await page.mouse.move(1200, 120)
  await wait(250)
  await page.mouse.up()
  await wait(600)
  check('resumen examen: el puerto está en pantalla', !!port)
  if (!port) {
    await page.close()
    return
  }

  // 2) Partida nueva en EXAMEN desde el menú. Al empezar otra partida los puertos
  //    y la cámara de la fase no cambian, así que las coordenadas de arriba
  //    siguen valiendo. Se llega a los conectores rindiendo las dos fases
  //    anteriores: eso deja además piezas sin colocar, que es la mitad del resumen.
  check('resumen examen: se puede volver al menú', await clickButton(page, 'Menú'))
  await wait(1000)
  const examCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('resumen examen: el menú ofrece los dos modos', examCards.length >= 2, `${examCards.length}`)
  if (examCards.length < 2) {
    await page.close()
    return
  }
  await examCards[1].click() // examen
  await page.waitForSelector('.badge--exam', { timeout: 60000 })
  await wait(1200)
  check('resumen examen: se puede rendir una fase', await clickButton(page, 'Rendirse'))
  await wait(1300)
  check('resumen examen: se puede rendir otra fase', await clickButton(page, 'Rendirse'))
  await wait(3500)
  const examStage = await page.$eval('.badge--stage', (el) => el.textContent.trim()).catch(() => '<sin>')
  check('resumen examen: el examen llega a los conectores', examStage === '3. Conectores', examStage)

  // 3) Un fallo de verdad: el señuelo sobre un puerto real.
  const dropped = await dragTo(iDecoy, port)
  await wait(500)
  check('resumen examen: el fallo llegó a soltarse', dropped)

  // 4) Rendirse en las dos fases que quedan para terminar.
  check('resumen examen: se puede rendir los conectores', await clickButton(page, 'Rendirse'))
  await wait(1300)
  check('resumen examen: se puede rendir la última fase', await clickButton(page, 'Rendirse'))
  await wait(1300)

  // Lo que ve el alumnado: el título de la tarjeta y sus contadores.
  const title = await page
    .$eval('.overlay .card h1', (el) => el.textContent.trim())
    .catch(() => '')
  check('resumen examen: la partida terminó', title === 'Examen terminado', `«${title}»`)
  const boxes = await page.$$eval('.score-box', (els) =>
    Object.fromEntries(
      els.map((el) => [
        (el.querySelector('.lbl')?.textContent ?? '').trim(),
        Number(((el.querySelector('.val')?.textContent ?? '').replace(/\D/g, '')) || 0),
      ]),
    ),
  )
  check('resumen examen: el fallo se contó', boxes.Fallos >= 1, JSON.stringify(boxes))
  check('resumen examen: hay piezas sin colocar', boxes['Sin colocar'] >= 1, JSON.stringify(boxes))

  const missRows = await rowsOf('.finish-review--misses .finish-review__list li')
  const unplacedRows = await rowsOf('.finish-review--unplaced .finish-review__list li')
  check('resumen examen: el resumen final está en pantalla', !!(await page.$('.finish-review')))
  check(
    'resumen examen: hay una fila por fallo',
    missRows.length === boxes.Fallos && missRows.length >= 1,
    `${missRows.length} filas / ${boxes.Fallos} fallos`,
  )
  check(
    'resumen examen: la fila nombra la pieza que se arrastró',
    !!cat.decoy && (missRows[0] ?? '').includes(`«${cat.decoy.name}»`),
    `«${missRows[0] ?? ''}»`,
  )
  check(
    'resumen examen: la fila dice qué iba ahí',
    /→ ahí va «.+»/.test(missRows[0] ?? ''),
    `«${missRows[0] ?? ''}»`,
  )
  const dragged = (missRows[0] ?? '').match(/Pusiste «(.+?)»/)?.[1] ?? ''
  const correct = (missRows[0] ?? '').match(/→ ahí va «(.+?)»/)?.[1] ?? ''
  check(
    'resumen examen: lo que iba ahí no es lo que se arrastró',
    !!dragged && !!correct && dragged !== correct,
    `«${dragged}» → «${correct}»`,
  )
  check(
    'resumen examen: el sitio nombrado es un puerto de la fase',
    cat.portLabels.some((label) => (missRows[0] ?? '').includes(`«${label}»`)),
    `«${missRows[0] ?? ''}»`,
  )
  check(
    'resumen examen: hay una fila por pieza sin colocar',
    unplacedRows.length === boxes['Sin colocar'],
    `${unplacedRows.length} filas / ${boxes['Sin colocar']} sin colocar`,
  )
  // El cable que sobra no encaja en ningún puerto, así que solo puede quedarse
  // sin colocar en la identificación: allí TODAS las piezas se colocan en su
  // cartel y por eso cuentan, incluidos los señuelos (es la regla de
  // `STAGE_STEPS`, no un descuido).
  const decoyRows = unplacedRows.filter((row) => row.includes(cat.decoy.name))
  check(
    'resumen examen: el cable que sobra solo falta en la identificación',
    decoyRows.length >= 1 && decoyRows.every((row) => row.includes('identificación')),
    decoyRows.slice(0, 4).join(' | ') || 'no aparece',
  )
  check(
    'resumen examen: cada pieza sin colocar dice en qué fase faltaba',
    unplacedRows.length > 0 &&
      unplacedRows.every((row) =>
        /\((identificación|sobre la placa|conectores|periféricos)\)/.test(row),
      ),
    unplacedRows.slice(0, 3).join(' | '),
  )

  check('resumen examen: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 15. La carga del modelo pesado se avisa con una barra ---------- */
async function loadingBar() {
  // El `.glb` de la placa pesa 18,8 MB (el mayor, `motherboard-01`), así que en
  // el aula no llega de golpe. Hasta ahora lo único que se veía era el
  // placeholder procedural, que aparecía y luego se sustituía sin explicar nada.
  //
  // La red se estrangula DESPUÉS de cargar la app (si no, cargar el propio
  // programa tardaría minutos) para que la carga del modelo dure lo suficiente
  // como para mirarla en vez de adivinarla.
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  // Sin caché: las secciones anteriores ya cargaron este mismo modelo, así que la
  // barra podría no aparecer (o durar demasiado poco para verla) y la prueba
  // saldría frágil (hallazgo R3-001 de la revisión nativa).
  await page.setCacheEnabled(false)
  const client = await page.createCDPSession()
  await client.send('Network.enable')

  // Control negativo: en el menú no se carga ningún modelo, así que no hay barra.
  check('carga: en el menú no hay barra de carga', !(await page.$('.loadingbar')))

  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('carga: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }

  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 40,
    downloadThroughput: 1500 * 1024,
    uploadThroughput: 300 * 1024,
  })

  await menuCards[0].click() // práctica
  await page.waitForSelector('.topbar', { timeout: 60000 })
  // La fase de la placa es la que monta el modelo grande (no hay preloads). Se
  // salta con el botón, no con el store: así el aviso no depende de qué
  // instancia del módulo tenga la app bajo HMR.
  check('carga: se puede saltar a la fase de la placa', await clickButton(page, 'Saltar fase'))

  const reading = () =>
    page
      .$eval('.loadingbar', (bar) => {
        const fill = bar.querySelector('.loadingbar__fill')
        return {
          label: bar.querySelector('.loadingbar__label')?.textContent?.trim() ?? '',
          pct: bar.querySelector('.loadingbar__pct')?.textContent?.trim() ?? '',
          ancho: fill ? fill.style.width : '',
          pointerEvents: getComputedStyle(bar).pointerEvents,
          role: bar.getAttribute('role') ?? '<sin role>',
          valor: bar.getAttribute('aria-valuenow') ?? '<sin aria-valuenow>',
          nombre: bar.getAttribute('aria-label') ?? '<sin aria-label>',
        }
      })
      .catch(() => null)

  let bar = null
  for (let t = 0; t < 80 && !bar; t++) {
    await wait(250)
    bar = await reading()
  }
  check('carga: la barra aparece mientras llega el modelo', !!bar, JSON.stringify(bar))
  if (bar) {
    check('carga: la barra dice qué está cargando', bar.label.startsWith('Cargando'), `«${bar.label}»`)
    check('carga: la barra dice un porcentaje', /^\d+ %$/.test(bar.pct), `«${bar.pct}»`)
    check(
      'carga: la barra se rellena con ese porcentaje',
      /^\d+(\.\d+)?%$/.test(bar.ancho),
      `ancho «${bar.ancho}» con ${bar.pct}`,
    )
    check(
      'carga: la barra no bloquea el juego',
      bar.pointerEvents === 'none',
      `pointer-events: ${bar.pointerEvents}`,
    )
    // Se anuncia como progreso con su valor, no como `status` con `aria-live`:
    // el porcentaje cambia decenas de veces y un lector de pantalla encolaría un
    // anuncio por cada cambio (hallazgo R4-002 de la revisión nativa).
    check(
      'carga: la barra se anuncia como progreso con su valor',
      bar.role === 'progressbar' &&
        bar.valor === bar.pct.replace(' %', '') &&
        bar.nombre.startsWith('Cargando'),
      `role=${bar.role}, aria-valuenow=${bar.valor}, aria-label=«${bar.nombre}» con ${bar.pct}`,
    )
  }

  // Sin estrangulamiento la carga termina, y la barra se va: no se queda pegada.
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  let gone = false
  for (let t = 0; t < 120 && !gone; t++) {
    await wait(250)
    gone = !(await page.$('.loadingbar'))
  }
  check('carga: al terminar, la barra desaparece', gone)
  check('carga: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 16. El cartel de fase explica qué hacer al empezarla ---------- */
async function stageBanner() {
  // En práctica, al empezar cada fase (también la primera) sale el cartel con lo
  // que hay que hacer; en examen no sale nunca: no da explicaciones.
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('cartel de fase: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }
  const lee = () =>
    page
      .$eval('.stage-banner', (el) => ({
        kicker: (el.querySelector('.stage-banner__kicker')?.textContent ?? '').trim(),
        titulo: (el.querySelector('h2')?.textContent ?? '').trim(),
        texto: (el.querySelector('p')?.textContent ?? '').trim(),
      }))
      .catch(() => null)

  await menuCards[0].click() // práctica
  await page.waitForSelector('.topbar', { timeout: 60000 })
  await wait(700)
  const esperado = await page.evaluate(async () => {
    const m = await import('/src/data/stages.ts')
    return m.STAGES.map((s) => ({ id: s.id, titulo: s.title, texto: s.hint, corto: s.short }))
  })
  const primero = await lee()
  check(
    'cartel de fase: al empezar la partida explica la primera fase',
    !!primero && primero.kicker === 'Fase 1 de 4' && primero.titulo === `1. ${esperado[0].titulo}`,
    JSON.stringify(primero),
  )
  check(
    'cartel de fase: el texto es el de esa fase',
    !!primero && primero.texto === esperado[0].texto,
    `«${primero?.texto ?? ''}»`,
  )

  let ido = false
  for (let t = 0; t < 24 && !ido; t++) {
    await wait(250)
    ido = !(await page.$('.stage-banner'))
  }
  check('cartel de fase: se quita solo', ido)

  check('cartel de fase: se puede saltar de fase', await clickButton(page, 'Saltar fase'))
  await wait(800)
  const segunda = await lee()
  check(
    'cartel de fase: al saltar explica la fase nueva (y no dice «completada»)',
    !!segunda && segunda.kicker === 'Fase 2 de 4' && segunda.titulo === `2. ${esperado[1].titulo}`,
    JSON.stringify(segunda),
  )

  // Y al COMPLETAR una fase el cartel lo dice: se completa la fase 2 colocando sus
  // piezas con el mismo gesto que usa el resto del arnés (lista + zona iluminada).
  // Hay que abrir la lista a mano (el panel arranca plegado) y usar los índices de
  // SU grupo: la lista agrupa las piezas por fase y solo deja seleccionar las de la
  // fase actual, así que las de la fase 2 empiezan en `IDENTIFY` (las 18 de la
  // identificación van primero).
  await openSidePanel(page)
  let intentos = 0
  let ultimoOk = null
  for (let n = 0; n < 10; n++) {
    const fase = await page.$eval('.badge--stage', (el) => el.textContent.trim()).catch(() => '')
    if (fase !== esperado[1].corto) break
    ultimoOk = await place(page, IDENTIFY + n)
    intentos++
    await wait(900)
    if (!ultimoOk) break
  }
  const faseFinal = await page
    .$eval('.badge--stage', (el) => el.textContent.trim())
    .catch(() => '<sin badge>')
  // El cartel dura 3,6 s y el momento exacto en que aparece depende del último
  // encaje, así que se sondea en vez de leerlo en un instante.
  let completada = null
  for (let t = 0; t < 24 && !completada; t++) {
    const visto = await lee()
    if (visto && visto.kicker === 'Fase completada') completada = visto
    else await wait(250)
  }
  check(
    'cartel de fase: al completar una fase lo dice',
    !!completada && completada.titulo === `3. ${esperado[2].titulo}`,
    `${JSON.stringify(completada)} · fase final «${faseFinal}» · ${intentos} colocaciones, último ok=${ultimoOk}`,
  )
  check('cartel de fase: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()

  // En examen no aparece nunca.
  const examen = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const cartas = await examen.page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => examen.page.$$('button.mode-card'))
    .catch(() => [])
  check('cartel de fase: el examen arranca', cartas.length >= 2, `${cartas.length} tarjetas`)
  if (cartas.length >= 2) {
    await cartas[1].click()
    await examen.page.waitForSelector('.badge--exam', { timeout: 60000 })
    await wait(1500)
    check('cartel de fase: en examen no aparece', !(await examen.page.$('.stage-banner')))
  }
  check('cartel de fase: examen sin errores', examen.errors.length === 0, examen.errors.join(' | '))
  await examen.page.close()
}

/* ---------- 17. La pieza seleccionada se ve ampliada en la fase 1 ---------- */
/**
 * Proyecta puntos del mundo de la fase 1 a la pantalla. La cámara de la fase 1 es
 * fija y la declara `stages.ts`, pero el arnés no tiene la instancia del lienzo: la
 * proyección se hace a mano con su posición, su objetivo y su fov (45°).
 */
async function proyectaFase1(page, puntos) {
  return page.evaluate(async (puntos) => {
    const st = await import('/src/data/stages.ts')
    const stage = st.STAGES[0]
    const [px, py, pz] = stage.camera.position
    const [tx, ty, tz] = stage.camera.target
    const n = Math.hypot(tx - px, ty - py, tz - pz)
    const f = [(tx - px) / n, (ty - py) / n, (tz - pz) / n]
    const r = [-f[2], 0, f[0]]
    const nr = Math.hypot(...r)
    r[0] /= nr
    r[2] /= nr
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    const tan = Math.tan((45 * Math.PI) / 180 / 2)
    const W = window.innerWidth
    const H = window.innerHeight
    return puntos.map(([x, y, z]) => {
      const d = [x - px, y - py, z - pz]
      const xv = d[0] * r[0] + d[1] * r[1] + d[2] * r[2]
      const yv = d[0] * u[0] + d[1] * u[1] + d[2] * u[2]
      const zv = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]
      return { x: (xv / (zv * tan * (W / H)) + 1) / 2 * W, y: (1 - yv / (zv * tan)) / 2 * H }
    })
  }, puntos)
}

/**
 * Punto del mundo de la fase 1: `'pieza'` es la pieza de la mesa del alumno y
 * `'cartel'` es el cartel que le toca (los huecos de la fase 1,
 * `MOUNTS_BY_STAGE.identify`), desplazado `dz` en profundidad si se pide (para
 * probar sueltas cerca del borde). El `y` de la pieza no es `def.size / 2`: la
 * pieza dibujada no mide lo que su `size` (la encoge `trayScaleFor` hasta 0,75) y
 * apuntar a la mitad de su `size` cae muy por encima de ella.
 */
async function puntoFase1(page, id, que, dz = 0) {
  return page.evaluate(
    async ({ id, que, dz }) => {
      const c = await import('/src/data/components.ts')
      const st = await import('/src/data/stages.ts')
      const stage = st.STAGES[0]
      const def = c.COMPONENT_BY_ID[id]
      if (que === 'cartel') {
        const mount = c.MOUNTS_BY_STAGE.identify.find((m) => m.accepts.includes(def.kind))
        if (!mount) return null
        return [mount.position[0], mount.position[1], mount.position[2] + dz]
      }
      return [
        def.identifyPos[0],
        stage.tray.surfaceY + Math.min(def.size, 0.75) / 2,
        def.identifyPos[1],
      ]
    },
    { id, que, dz },
  )
}

/** Punto de pantalla de una pieza de la mesa o del cartel que le toca. */
async function pantallaFase1(page, id, que, dz = 0) {
  const mundo = await puntoFase1(page, id, que, dz)
  if (!mundo) return null
  const [punto] = await proyectaFase1(page, [mundo])
  return punto
}

async function componentZoom() {
  // En la fase 1 están todas las piezas sobre la mesa y los conectores se ven muy
  // pequeños: al seleccionar una, sale una ventanita con la pieza ampliada (el
  // PNG del conector si existe, si no una vista 3D de cerca). En examen el panel
  // también sale —la forma ayuda— pero SIN el nombre: nombrarla es una pista.
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const menuCards = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('zoom: menú de modos visible', menuCards.length >= 2, `${menuCards.length}`)
  if (menuCards.length < 2) {
    await page.close()
    return
  }
  const lee = () =>
    page
      .$eval('.zoom', (el) => ({
        img: !!el.querySelector('.zoom__img'),
        canvas: !!el.querySelector('canvas'),
        nombre: (el.querySelector('.zoom__name')?.textContent ?? '').trim(),
        pointerEvents: getComputedStyle(el).pointerEvents,
        visible: getComputedStyle(el).visibility !== 'hidden',
      }))
      .catch(() => null)
  const elegir = async (texto) => {
    for (const item of await page.$$('button.comp-item')) {
      const name = ((await item.evaluate((el) => el.querySelector('.name')?.textContent)) ?? '').trim()
      if (!name.includes(texto)) continue
      await item.click()
      await wait(700)
      return name
    }
    return null
  }

  await menuCards[0].click() // práctica
  await page.waitForSelector('.topbar', { timeout: 60000 })
  await openSidePanel(page)
  await wait(400)
  // El panel se queda montado durante toda la fase 1 y se oculta sin selección:
  // montarlo y desmontarlo con cada colocación (18 por partida) creaba un contexto
  // WebGL por ciclo (R4-001).
  const z0 = await lee()
  check(
    'zoom: sin pieza seleccionada el panel está montado y oculto',
    !!z0?.canvas && z0.visible === false,
    JSON.stringify(z0) ?? 'sin panel',
  )

  const conPng = await elegir('Cable PS/2')
  const z1 = await lee()
  check('zoom: al seleccionar un conector sale el panel', !!z1, JSON.stringify(z1) ?? 'sin panel')
  check('zoom: el conector se enseña con su imagen nítida', !!z1?.img, JSON.stringify(z1))
  check(
    'zoom: en práctica el panel dice el nombre',
    !!conPng && z1?.nombre === conPng,
    `«${z1?.nombre ?? ''}» frente a «${conPng ?? ''}»`,
  )
  check('zoom: el panel no bloquea los clics', z1?.pointerEvents === 'none', `pointer-events: ${z1?.pointerEvents}`)

  // Se marca el nodo del lienzo y se da una vuelta entera al ciclo de la fase 1:
  // seleccionar → colocar (que deselecciona) → seleccionar, que es lo que pasa 18
  // veces por partida. Si el panel se remontara en cada vuelta, el marcador
  // desaparecería (sería otro nodo, o no habría ninguno).
  const marcado = await page
    .$eval('.zoom canvas', (el) => {
      el.dataset.marca = 'panel-unico'
      return true
    })
    .catch(() => false)

  const colocado = await place(page, 0)
  check('zoom: se coloca una pieza en la fase 1', colocado)
  await wait(400)
  const trasColocar = await lee()
  const marcaTrasColocar = await page
    .$eval('.zoom canvas', (el) => el.dataset.marca === 'panel-unico')
    .catch(() => false)
  check(
    'zoom: tras colocar una pieza el panel sigue montado y oculto',
    !!trasColocar?.canvas && trasColocar.visible === false && marcaTrasColocar,
    `${JSON.stringify(trasColocar)} · marcador: ${marcaTrasColocar}`,
  )

  await elegir('CPU')
  const z2 = await lee()
  check(
    'zoom: una pieza sin imagen se enseña en 3D',
    !!z2?.canvas && z2?.img === false,
    JSON.stringify(z2),
  )
  const z2marca = await page
    .$eval('.zoom canvas', (el) => el.dataset.marca === 'panel-unico')
    .catch(() => false)
  check(
    'zoom: el lienzo del panel es el mismo tras un ciclo de colocación',
    marcado && z2marca,
    `marcado: ${marcado}, marcador presente: ${z2marca}`,
  )
  const lienzos = await page.$$eval('canvas', (els) => els.length)
  check('zoom: solo hay dos lienzos (escena y panel) tras el ciclo', lienzos === 2, `${lienzos}`)

  check('zoom: se puede saltar de fase', await clickButton(page, 'Saltar fase'))
  await wait(1200)
  await elegir('CPU')
  // Fuera de la fase 1 el panel se desmonta del todo: el lienzo solo hace falta
  // mientras están las piezas sobre la mesa.
  check('zoom: fuera de la fase 1 el panel se desmonta', !(await page.$('.zoom')))
  check('zoom: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()

  // En examen: se coge una pieza de la mesa (no hay lista) y el panel sale sin
  // nombre. La posición de la pieza en pantalla se calcula con la cámara de la
  // fase, sin tocar el store.
  const examen = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const cartas = await examen.page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => examen.page.$$('button.mode-card'))
    .catch(() => [])
  check('zoom: el examen arranca', cartas.length >= 2, `${cartas.length} tarjetas`)
  if (cartas.length < 2) {
    await examen.page.close()
    return
  }
  await cartas[1].click()
  await examen.page.waitForSelector('.badge--exam', { timeout: 60000 })
  await wait(1500)
  check('zoom: en examen tampoco se ve el panel sin coger nada', !(await zoomPanelVisible(examen.page)))

  const mayor = await examen.page.evaluate(() =>
    import('/src/data/components.ts').then((m) => {
      const def = [...m.COMPONENTS_BY_STAGE.identify].sort((a, b) => b.size - a.size)[0]
      return { id: def.id, size: def.size }
    }),
  )
  const punto = await pantallaFase1(examen.page, mayor.id, 'pieza')
  let cogida = false
  for (const [dx, dy] of COGER_PIEZA) {
    await examen.page.mouse.click(punto.x + dx, punto.y + dy)
    await wait(500)
    if (await zoomPanelVisible(examen.page)) {
      cogida = true
      break
    }
  }
  check('zoom: en examen sale el panel al coger la pieza', cogida, JSON.stringify(punto))
  if (cogida) {
    const z3 = await examen.page.$eval('.zoom', (el) => ({
      img: !!el.querySelector('.zoom__img'),
      canvas: !!el.querySelector('canvas'),
      tieneNombre: !!el.querySelector('.zoom__name'),
      visible: getComputedStyle(el).visibility !== 'hidden',
      texto: (el.textContent ?? '').trim(),
    }))
    check(
      'zoom: en examen el panel NO dice el nombre de la pieza',
      z3.tieneNombre === false && z3.texto === '',
      JSON.stringify(z3),
    )
    check('zoom: en examen la pieza se enseña igual (3D o imagen)', !!z3.canvas || !!z3.img, JSON.stringify(z3))
    check('zoom: al coger la pieza el panel se ve', z3.visible === true, JSON.stringify(z3))
  }
  check('zoom: examen sin errores de página', examen.errors.length === 0, examen.errors.join(' | '))
  await examen.page.close()
}

/**
 * La fase 1 de examen tiene su propio aviso en la barra de estado: al arrastrar una
 * pieza sobre su cartel, nombrar el cartel correcto es la respuesta entera.
 *
 * Se ejerce el gesto de verdad (coger la pieza de la mesa y llevarla al cartel)
 * porque el aviso solo sale con el puntero encima del hueco, y se comprueba además
 * que el puntero sí llegó a estar encima: sin eso, la negativa pasaría sin haber
 * probado nada.
 */
async function examIdentifyHint() {
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const cartas = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('examen fase 1: menú de modos visible', cartas.length >= 2, `${cartas.length}`)
  if (cartas.length < 2) {
    await page.close()
    return
  }
  await cartas[1].click() // examen
  await page.waitForSelector('.badge--exam', { timeout: 60000 })
  await wait(1500)

  const estado = (clave) =>
    page.evaluate(
      (clave) =>
        import('/src/store/useGameStore.ts').then(
          (m) => m.useGameStore.getState()[clave],
        ),
      clave,
    )
  const barra = () =>
    page.$eval('.statusbar span:last-child', (el) => el.textContent.trim()).catch(() => '')

  const mayor = await page.evaluate(() =>
    import('/src/data/components.ts').then((m) => {
      const def = [...m.COMPONENTS_BY_STAGE.identify].sort((a, b) => b.size - a.size)[0]
      return { id: def.id, name: def.name }
    }),
  )
  const pieza = await pantallaFase1(page, mayor.id, 'pieza')
  const cartel = await pantallaFase1(page, mayor.id, 'cartel')
  check(
    'examen fase 1: la pieza y su cartel se localizan en pantalla',
    !!pieza && !!cartel,
    `${mayor.name}: ${JSON.stringify(pieza)} · cartel ${JSON.stringify(cartel)}`,
  )
  if (!pieza || !cartel) {
    await page.close()
    return
  }

  // Coger la pieza falla si el clic cae en el hueco entre geometrías, así que se
  // prueban los mismos desplazamientos que usa el resto de la fase 1 (`COGER_PIEZA`).
  let visto = null
  for (const [dx, dy] of COGER_PIEZA) {
    await page.mouse.move(pieza.x + dx, pieza.y + dy)
    await page.mouse.down()
    await wait(300)
    if (!(await estado('dragging'))) {
      await page.mouse.up()
      await wait(200)
      continue
    }
    await page.mouse.move(pieza.x + dx, pieza.y + dy - 40)
    await wait(250)
    await page.mouse.move(cartel.x, cartel.y)
    await wait(500)
    visto = { hover: await estado('hoverMountId'), barra: await barra() }
    await page.mouse.up()
    await wait(600)
    break
  }

  check('examen fase 1: la pieza se llega a coger y arrastrar', !!visto, `${mayor.name}`)
  check(
    'examen fase 1: el puntero llegó a estar sobre el cartel correcto',
    !!visto?.hover,
    `${visto?.hover ?? 'sin hueco'} · «${visto?.barra ?? 'sin barra'}»`,
  )
  check(
    'examen fase 1: la barra de estado no nombra el cartel',
    !!visto?.hover && !/Suelta aquí/.test(visto.barra),
    `«${visto?.barra ?? ''}»`,
  )
  check(
    'examen fase 1: la barra dice la instrucción de siempre',
    visto?.barra === 'Lleva la pieza hasta el hueco correcto.',
    `«${visto?.barra ?? ''}»`,
  )
  check('examen fase 1: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()
}

/**
 * Los carteles de la fase 1. Cada cartel acepta un solo tipo de pieza, así que la
 * pieza NUNCA se coloca en el cartel equivocado: el fallo que reportó el alumnado
 * es otro. `endDrag` cuenta un fallo cuando no hay cartel correcto a `snapRadius`
 * y sí uno AJENO a `wrongRadius`, de modo que la «banda que cuenta el vecino»
 * existe mientras dos carteles estén más cerca que `snapRadius + wrongRadius`
 * (0,6 + 0,6 = 1,2 u).
 *
 * Se comprueban las dos caras: la regla sobre el reparto (geométrica) y el efecto
 * observable en examen —soltar 0,7 u hacia el cartel vecino más próximo— que es lo
 * que hacía perder puntos.
 */
async function identifyCards() {
  const { page, errors } = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const cartas = await page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => page.$$('button.mode-card'))
    .catch(() => [])
  check('carteles: menú de modos visible', cartas.length >= 2, `${cartas.length}`)
  if (cartas.length < 2) {
    await page.close()
    return
  }
  await wait(600)

  const reparto = await page.evaluate(async () => {
    const c = await import('/src/data/components.ts')
    const st = await import('/src/data/stages.ts')
    const stage = st.STAGES[0]
    const mounts = c.MOUNTS_BY_STAGE.identify
    const [w, d] = mounts[0].size
    let minPlano = Infinity
    let minX = Infinity
    let minZ = Infinity
    for (let i = 0; i < mounts.length; i++) {
      for (let j = i + 1; j < mounts.length; j++) {
        const dx = Math.abs(mounts[i].position[0] - mounts[j].position[0])
        const dz = Math.abs(mounts[i].position[2] - mounts[j].position[2])
        minPlano = Math.min(minPlano, Math.hypot(dx, dz))
        if (dz < 0.01) minX = Math.min(minX, dx)
        if (dx < 0.01) minZ = Math.min(minZ, dz)
      }
    }
    return {
      cuantos: mounts.length,
      piezas: c.COMPONENTS_BY_STAGE.identify.length,
      snap: Math.max(...mounts.map((m) => m.snapRadius)),
      wrong: stage.drop.wrongRadius,
      minPlano,
      minX,
      minZ,
      bordeTrasero: Math.min(...mounts.map((m) => m.position[2])) - d / 2,
      mesaTrasera: stage.bench.center[1] - stage.bench.depth / 2,
      esquinas: mounts.map((m) => [
        [m.position[0] - w / 2, 0.09, m.position[2] - d / 2],
        [m.position[0] + w / 2, 0.09, m.position[2] - d / 2],
        [m.position[0] - w / 2, 0.09, m.position[2] + d / 2],
        [m.position[0] + w / 2, 0.09, m.position[2] + d / 2],
      ]),
    }
  })

  check(
    'carteles: hay uno por cada pieza',
    reparto.cuantos === reparto.piezas,
    `${reparto.cuantos} carteles para ${reparto.piezas} piezas`,
  )
  check(
    'carteles: ningún cartel ajeno cabe en la banda de fallo del suyo',
    reparto.minPlano >= reparto.snap + reparto.wrong,
    `separación mínima ${reparto.minPlano.toFixed(2)} u (X ${reparto.minX.toFixed(2)}, Z ${reparto.minZ.toFixed(2)}) frente a snapRadius + wrongRadius = ${(reparto.snap + reparto.wrong).toFixed(2)} u`,
  )
  check(
    'carteles: la fila de atrás cabe en la mesa',
    reparto.bordeTrasero >= reparto.mesaTrasera,
    `borde trasero ${reparto.bordeTrasero.toFixed(2)} u, la mesa llega a ${reparto.mesaTrasera.toFixed(2)} u`,
  )

  // Hueco en pantalla entre los rectángulos de dos tarjetas vecinas: es lo que se
  // ve («están muy pegadas»). El umbral es el medido con este reparto (31 px); con
  // las filas a 0,95 u eran 23 px.
  const proyectadas = await proyectaFase1(page, reparto.esquinas.flat())
  const cajas = reparto.esquinas.map((_, i) => {
    const pts = proyectadas.slice(i * 4, i * 4 + 4)
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  })
  let hueco = Infinity
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const dx = Math.max(0, Math.max(cajas[j].x0 - cajas[i].x1, cajas[i].x0 - cajas[j].x1))
      const dy = Math.max(0, Math.max(cajas[j].y0 - cajas[i].y1, cajas[i].y0 - cajas[j].y1))
      hueco = Math.min(hueco, Math.hypot(dx, dy))
    }
  }
  check(
    'carteles: dos tarjetas vecinas no se pegan en pantalla',
    hueco >= 28,
    `${Math.round(hueco)} px de hueco entre las dos más próximas; hacen falta 28`,
  )
  check('carteles: el reparto se mide sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()

  // El efecto que reportó el alumnado, en examen y con el ratón: se elige la pieza
  // cuyo cartel tiene al vecino MÁS próximo (con el reparto anterior son las filas a
  // 0,95 u) y se suelta 0,7 u hacia él, que es media tarjeta más allá de su borde.
  const examen = await newPage(browser, `${BASE_URL}/?board=motherboard-01`)
  const cartasExamen = await examen.page
    .waitForSelector('button.mode-card', { timeout: 60000 })
    .then(() => examen.page.$$('button.mode-card'))
    .catch(() => [])
  check('carteles: el examen arranca', cartasExamen.length >= 2, `${cartasExamen.length} tarjetas`)
  if (cartasExamen.length < 2) {
    await examen.page.close()
    return
  }
  await cartasExamen[1].click()
  await examen.page.waitForSelector('.badge--exam', { timeout: 60000 })
  await wait(1500)

  const objetivo = await examen.page.evaluate(async () => {
    const c = await import('/src/data/components.ts')
    const mounts = c.MOUNTS_BY_STAGE.identify
    let mejor = null
    for (const def of c.COMPONENTS_BY_STAGE.identify) {
      const m = mounts.find((o) => o.accepts.includes(def.kind))
      if (!m) continue
      let best = Infinity
      let dir = null
      for (const otro of mounts) {
        if (otro === m) continue
        const dx = otro.position[0] - m.position[0]
        const dz = otro.position[2] - m.position[2]
        const d = Math.hypot(dx, dz)
        if (d < best) {
          best = d
          dir = [dx / d, dz / d]
        }
      }
      if (!mejor || best < mejor.distancia) {
        mejor = { id: def.id, name: def.name, distancia: best, dir, cartel: m.position }
      }
    }
    return mejor
  })
  const cerca = {
    x: objetivo.cartel[0] + objetivo.dir[0] * 0.7,
    z: objetivo.cartel[2] + objetivo.dir[1] * 0.7,
  }
  const pieza = await pantallaFase1(examen.page, objetivo.id, 'pieza')
  const [lejos] = await proyectaFase1(examen.page, [[cerca.x, objetivo.cartel[1], cerca.z]])
  const [encima] = await proyectaFase1(examen.page, [objetivo.cartel])
  check(
    'carteles: la pieza, su cartel y el punto vecino se localizan en pantalla',
    !!pieza && !!lejos && !!encima,
    `${objetivo.name}: pieza ${JSON.stringify(pieza)}, a 0,7 u ${JSON.stringify(lejos)} (vecino a ${objetivo.distancia.toFixed(2)} u)`,
  )
  if (!pieza || !lejos || !encima) {
    await examen.page.close()
    return
  }

  const juego = () =>
    examen.page.evaluate(() =>
      import('/src/store/useGameStore.ts').then((m) => {
        const s = m.useGameStore.getState()
        return {
          errors: s.errors,
          colocadas: Object.keys(s.placed).length,
          filas: s.misses.length,
        }
      }),
    )
  const puntos = () =>
    examen.page.$$eval('.topbar .badge', (els) =>
      els.map((el) => el.textContent ?? '').find((t) => t.startsWith('Puntos:')) ?? '',
    )

  // Coger la pieza falla si el clic cae en el hueco entre geometrías: mismos
  // desplazamientos que usan las otras secciones de la fase 1.
  const arrastra = async (destino) => {
    for (const [dx, dy] of COGER_PIEZA) {
      await examen.page.mouse.move(pieza.x + dx, pieza.y + dy)
      await examen.page.mouse.down()
      await wait(300)
      const cogida = await examen.page.evaluate(() =>
        import('/src/store/useGameStore.ts').then((m) => m.useGameStore.getState().dragging),
      )
      if (!cogida) {
        await examen.page.mouse.up()
        await wait(200)
        continue
      }
      await examen.page.mouse.move(pieza.x + dx, pieza.y + dy - 40)
      await wait(250)
      await examen.page.mouse.move(destino.x, destino.y)
      await wait(500)
      await examen.page.mouse.up()
      await wait(800)
      return true
    }
    return false
  }

  const antes = await juego()
  const puntosAntes = await puntos()
  const soltado = await arrastra(lejos)
  const despues = await juego()
  const puntosDespues = await puntos()
  check(
    'carteles: la pieza se coge y se suelta a 0,7 u de su cartel',
    soltado,
    `${objetivo.name}`,
  )
  check(
    'carteles: soltar pasado el borde no cuenta el cartel de al lado',
    despues.errors === antes.errors && despues.filas === antes.filas,
    `fallos ${antes.errors} → ${despues.errors}, filas del resumen ${antes.filas} → ${despues.filas}`,
  )
  check(
    'carteles: soltar pasado el borde no resta puntos',
    puntosDespues === puntosAntes,
    `${puntosAntes} → ${puntosDespues}`,
  )
  check(
    'carteles: la pieza no se coloca en el cartel de al lado',
    despues.colocadas === antes.colocadas,
    `${antes.colocadas} → ${despues.colocadas} colocadas`,
  )

  // Control: sobre su propio cartel sí coloca y no cuesta nada, tomando la línea
  // base DESPUÉS de la suelta anterior para que mida solo lo que hace esta. Sin el
  // control, la negativa de arriba pasaría aunque el arrastre no soltara nada.
  const colocado = await arrastra(encima)
  const final = await juego()
  check(
    'carteles: sobre su propio cartel la pieza se coloca',
    colocado && final.colocadas === despues.colocadas + 1,
    `${despues.colocadas} → ${final.colocadas} colocadas`,
  )
  check(
    'carteles: colocar bien no cuesta ningún fallo',
    final.errors === despues.errors,
    `${despues.errors} → ${final.errors}`,
  )
  check('carteles: sin errores de página', examen.errors.length === 0, examen.errors.join(' | '))
  await examen.page.close()
}

/**
 * Secciones de la pasada, en orden. `ONLY=examSummary,loadingBar` acota la
 * ejecución a las nombradas (para falsar un cambio sin pagar la pasada entera).
 */
const SECTIONS = [
  ['fullGame', fullGame],
  ['examGiveUpGuard', examGiveUpGuard],
  ['skipStageGuard', skipStageGuard],
  ['unknownBoardGuard', unknownBoardGuard],
  ['rotationsGuard', rotationsGuard],
  ['unknownBoardNoCalibration', unknownBoardNoCalibration],
  ['dragGhostVisible', dragGhostVisible],
  ['sidePanels', sidePanels],
  ['examNoHelp', examNoHelp],
  ['traySeparation', traySeparation],
  ['examDrag', examDrag],
  ['examSummary', examSummary],
  ['touchDrag', touchDrag],
  ['loadingBar', loadingBar],
  ['stageBanner', stageBanner],
  ['componentZoom', componentZoom],
  ['examIdentifyHint', examIdentifyHint],
  ['identifyCards', identifyCards],
]

const ONLY = process.env.ONLY
  ? process.env.ONLY.split(',').map((name) => name.trim())
  : null

// Un nombre que no existe —una errata o una mayúscula cambiada— dejaría la
// pasada en vacío y aun así diría «TODO OK»: se para y se dicen cuáles hay (lo
// señaló la revisión nativa: R4-001).
const unknown = ONLY
  ? ONLY.filter((name) => !SECTIONS.some(([section]) => section === name))
  : []
if (unknown.length > 0) {
  console.error(
    `ONLY: no existe la sección «${unknown.join(', ')}». Hay: ${SECTIONS.map(([n]) => n).join(', ')}`,
  )
  process.exit(1)
}

for (const [name, run] of SECTIONS) {
  if (ONLY && !ONLY.includes(name)) continue
  await run()
}

await browser.close()
console.log(failures === 0 ? '\nTODO OK' : `\n${failures} comprobaciones fallidas`)
process.exit(failures === 0 ? 0 : 1)
