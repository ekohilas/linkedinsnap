import { test, expect } from '@playwright/test'

test('QR instructions view', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('qr-instructions.png')
})

test('QR code view', async ({ page }) => {
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await expect(page).toHaveScreenshot('qr-code.png')
})

test('camera loading state', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => new Promise(() => {}) },
      writable: true,
      configurable: true,
    })
  })
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.loading-overlay')
  await expect(page).toHaveScreenshot('camera-loading.png')
})

test('camera error state', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: () => Promise.reject(new Error('Permission denied')),
      },
      writable: true,
      configurable: true,
    })
  })
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.error-overlay')
  await expect(page).toHaveScreenshot('camera-error.png')
})

test('camera ready state', async ({ page }) => {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const drawPerson = (x, shirtColor) => {
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 4
        // Head
        ctx.beginPath()
        ctx.arc(x, 120, 40, 0, Math.PI * 2)
        ctx.fillStyle = '#FDBCB4'
        ctx.fill()
        ctx.stroke()
        // Body
        ctx.fillStyle = shirtColor
        ctx.fillRect(x - 35, 160, 70, 100)
        ctx.strokeRect(x - 35, 160, 70, 100)
        // Arms
        ctx.beginPath()
        ctx.moveTo(x - 35, 180)
        ctx.lineTo(x - 90, 240)
        ctx.moveTo(x + 35, 180)
        ctx.lineTo(x + 90, 240)
        ctx.stroke()
        // Legs
        ctx.beginPath()
        ctx.moveTo(x - 20, 260)
        ctx.lineTo(x - 30, 380)
        ctx.moveTo(x + 20, 260)
        ctx.lineTo(x + 30, 380)
        ctx.stroke()
      }

      drawPerson(180, '#4169E1')
      drawPerson(460, '#DC143C')
    }

    const stream = canvas.captureStream(30)
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve(stream) },
      writable: true,
      configurable: true,
    })
  })
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.loading-overlay', { state: 'hidden' })
  await expect(page).toHaveScreenshot('camera-ready.png')
})
