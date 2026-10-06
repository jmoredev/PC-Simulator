/**
 * Pruebas end-to-end del simulador con Chromium headless.
 *
 *   npm run dev -- --port 5199        # en otra terminal
 *   node tests/run.mjs
 *
 * Variables: BASE_URL (por defecto http://127.0.0.1:5199), CHROME (ruta al binario).
 */
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import puppeteer from 'puppeteer-core'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5199'
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
  for (const [dx, dy] of [[0, 0], [0, -20], [0, 20], [-20, 0], [20, 0], [-20, -20], [20, 20]]) {
    await page.mouse.click(cx + dx, cy + dy)
    await wait(400)
    after = await readState()
    if (readPoints(after) !== null && readPoints(after) > (nBefore ?? -1)) break
    after = null
  }
  const nAfter = readPoints(after)
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

await fullGame()
await examGiveUpGuard()
await skipStageGuard()
await unknownBoardGuard()
await rotationsGuard()
await unknownBoardNoCalibration()

await browser.close()
console.log(failures === 0 ? '\nTODO OK' : `\n${failures} comprobaciones fallidas`)
process.exit(failures === 0 ? 0 : 1)
