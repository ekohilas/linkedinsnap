import { test, expect, type Page } from '@playwright/test'

// A phone camera flips its frames between portrait and landscape when the
// device rotates. iOS Safari then briefly draws the <video> element as a small
// letterboxed box (black bars) until it catches up with the new frame size.
// Chromium doesn't have that bug, so the fake camera reproduces the symptom by
// letterboxing the <video> itself while the stream flips.
const rotatingCamera = async (page: Page) => {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 640
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      ctx.fillStyle = '#3cb371'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2)
    }
    draw()
    // A capture stream only emits while the canvas is being painted.
    setInterval(draw, 30)

    Object.assign(window, {
      rotateCamera: () => {
        ;[canvas.width, canvas.height] = [canvas.height, canvas.width]
        draw()
        const glitch = document.createElement('style')
        glitch.textContent =
          'video { object-fit: contain !important; transform: scale(0.6) !important; }'
        document.head.append(glitch)
      },
    })

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve(canvas.captureStream(30)) },
      writable: true,
      configurable: true,
    })
  })
}

/** Share of the screen showing the black backdrop instead of the camera. */
const blackRatio = async (page: Page) => {
  const png = (await page.screenshot()).toString('base64')
  return page.evaluate(async (png) => {
    const img = new Image()
    img.src = `data:image/png;base64,${png}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, img.width, img.height)
    let black = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 16 && data[i + 1] < 16 && data[i + 2] < 16) black++
    }
    return black / (data.length / 4)
  }, png)
}

test('the camera preview stays full screen through a rotation', async ({ page }) => {
  await rotatingCamera(page)
  await page.goto('/#ekohilas')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.loading-overlay', { state: 'hidden' })
  expect(await blackRatio(page)).toBe(0)

  const { width, height } = page.viewportSize()!
  await page.setViewportSize({ width: height, height: width })
  await page.evaluate(() => (window as any).rotateCamera())

  for (let i = 0; i < 5; i++) {
    expect(await blackRatio(page)).toBe(0)
  }
})
