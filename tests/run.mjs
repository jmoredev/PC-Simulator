/**
 * Pruebas end-to-end del simulador con Chromium headless.
 *
 *   npm run dev -- --port 5199        # en otra terminal
 *   node tests/run.mjs
 *
 * Variables: BASE_URL (por defecto http://localhost:5199), CHROME (ruta al binario).
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

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME
  const root = join(homedir(), '.cache', 'puppeteer', 'chrome')
  if (!existsSync(root)) throw new Error('No encuentro Chromium. Define CHROME=<ruta>.')
  for (const dir of readdirSync(root)) {
    const bin = join(root, dir, 'chrome-linux64', 'chrome')
    if (existsSync(bin)) return bin
  }
  throw new Error('No encuentro el binario de Chromium. Define CHROME=<ruta>.')
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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
  check('examen sin ayudas: la leyenda de controles se queda', !!(await page.$('.help')))

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
        for (let run = 0; run < runs; run++) {
          shuffleLayout()
          for (let i = 0; i < defs.length; i++) {
            for (let j = i + 1; j < defs.length; j++) {
              const a = at(defs[i])
              const b = at(defs[j])
              const sep = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))
              if (sep < worst) worst = sep
              if (sep < 0.75) bad++
            }
          }
        }
        out[stage] = { piezas: defs.length, peor: +worst.toFixed(3), solapados: bad }
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
  // La identificación es la fase que se ve entera sobre la mesa y la que se
  // reportó con las clavijas de audio encima unas de otras: además de no
  // solaparse, deja aire de verdad entre piezas.
  check(
    'mesa: la identificación deja aire entre piezas',
    result.identify.peor >= 0.9,
    `separación mínima ${result.identify.peor} u (mínimo 0,9)`,
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
    await page.mouse.up()
    await wait(700)
    return { ok: true, hover }
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
  check('examen arrastre: sin errores de página', errors.length === 0, errors.join(' | '))
  await page.close()
}

await fullGame()
await examGiveUpGuard()
await skipStageGuard()
await unknownBoardGuard()
await rotationsGuard()
await unknownBoardNoCalibration()
await dragGhostVisible()
await sidePanels()
await examNoHelp()
await traySeparation()
await examDrag()

await browser.close()
console.log(failures === 0 ? '\nTODO OK' : `\n${failures} comprobaciones fallidas`)
process.exit(failures === 0 ? 0 : 1)
