import puppeteer from 'puppeteer-core'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5199'
const CHROME = process.env.CHROME
const OUT = 'E:/Dev/PC-Simulator/.scratch'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 860 })
await page.goto(`${BASE_URL}/?calibrate=1&board=motherboard-02`, { waitUntil: 'networkidle0', timeout: 300000 })
await page.waitForSelector('.calib', { timeout: 60000 })
await wait(8000)
const slotCount = await page.$$eval('.calib__slots .calib__slot', (els) => els.length)
console.log('huecos:', slotCount)
console.log('id:', await page.$eval('.calib__field input', (el) => el.value))
await page.screenshot({ path: `${OUT}/d0-top.png` })

// Arma "Panel trasero" (6.º hueco) y marca las dos esquinas de la chapa
const slots = await page.$$('.calib__slots .calib__slot')
await slots[5].click()
await wait(600)
await page.mouse.click(462, 520)
await wait(500)
await page.mouse.click(738, 540)
await wait(800)
await page.screenshot({ path: `${OUT}/d1-rear-marked.png` })

// Arma "Marcar puerto" para que la cámara se ponga de frente
const mark = await page.$$('.calib__ports-add .calib__slot')
await mark[0].click()
await wait(3500)
await page.screenshot({ path: `${OUT}/d2-rear-cam.png` })
console.log('ok')
await browser.close()
