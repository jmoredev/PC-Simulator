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
/** Piezas totales de la bandeja con la placa por defecto (incluye señuelos). */
const ITEMS = 20
/** Piezas que hay que colocar para terminar. */
const PLACEABLE = 18

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

async function newPage(browser, url) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 180000 })
  return { page, errors }
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
  await wait(5000)
  check('calibración: panel visible', !!(await page.$('.calib')))
  const slots = await page.$$('.calib__slots .calib__slot')
  check('calibración: 6 huecos', slots.length === 6, `${slots.length}`)

  await slots[0].click()
  await wait(300)
  await page.mouse.click(700, 430)
  await wait(400)
  const first = await page.$eval('.calib__slot-value', (el) => el.textContent)
  check('calibración: registra un punto', /-?\d/.test(first), first)

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
{
  const { page, errors } = await newPage(browser, BASE_URL)
  await wait(1500)
  ;(await page.$$('button.mode-card'))[0].click()
  await wait(3500)

  const placedCount = () => page.$$eval('.comp-item--placed', (els) => els.length)

  // Fase 1: las 6 piezas de la placa
  for (let i = 0; i < 6; i++) {
    await place(page, i)
  }

  // Fase 2: arrastrar un cable desde la barra inferior hasta su puerto
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
    dragged = true
  }
  const afterDrag = await placedCount()
  check('partida: arrastrar desde la barra de cables', dragged && afterDrag >= 7, `${afterDrag}`)

  // El resto, con clic y clic
  for (let i = 0; i < ITEMS; i++) {
    await place(page, i)
  }

  const progress = await page.$eval('.progress-label', (el) => el.textContent.trim())
  check(`partida: ${PLACEABLE}/${PLACEABLE} piezas`, progress === `${PLACEABLE}/${PLACEABLE}`, progress)
  const marked = await placedCount()
  check(`partida: ${PLACEABLE} piezas colocadas`, marked === PLACEABLE, `${marked}`)
  check('partida: modal final', !!(await page.$('.overlay')))
  check('partida: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\nTODO OK' : `\n${failures} comprobaciones fallidas`)
process.exit(failures === 0 ? 0 : 1)
