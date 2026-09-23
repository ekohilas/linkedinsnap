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

type Colour = 'black' | 'yellow'

/** Share of the screen showing a colour: the black backdrop, or the yellow
 * square in the middle of the fake camera's frames. */
const screenShare = async (page: Page, colour: Colour) => {
  const png = (await page.screenshot()).toString('base64')
  return page.evaluate(
    async ({ png, colour }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${png}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, img.width, img.height)
      const matches =
        colour === 'black'
          ? (r: number, g: number, b: number) => r < 16 && g < 16 && b < 16
          : (r: number, g: number, b: number) => r > 200 && g > 180 && b < 60
      let count = 0
      for (let i = 0; i < data.length; i += 4) {
        if (matches(data[i], data[i + 1], data[i + 2])) count++
      }
      return count / (data.length / 4)
    },
    { png, colour },
  )
}

/** Share of the screen the yellow square fills when a frame covers it like
 * object-fit: cover, i.e. without extra zoom. */
const coveredSquareShare = (
  frame: { width: number; height: number },
  screen: { width: number; height: number },
) => {
  const scale = Math.max(screen.width / frame.width, screen.height / frame.height)
  const width = Math.min(screen.width, (frame.width / 2) * scale)
  const height = Math.min(screen.height, (frame.height / 2) * scale)
  return (width * height) / (screen.width * screen.height)
}

test('the camera preview stays full screen through a rotation', async ({ page }) => {
  await rotatingCamera(page)
  await page.goto('/#ekohilas')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.loading-overlay', { state: 'hidden' })
  // The "tap to capture" pill would hide part of the square in landscape.
  await page.addStyleTag({ content: '.camera-overlay { visibility: hidden; }' })

  const portrait = page.viewportSize()!
  expect(await screenShare(page, 'black')).toBe(0)
  expect(await screenShare(page, 'yellow')).toBeCloseTo(
    coveredSquareShare({ width: 480, height: 640 }, portrait),
    2,
  )

  const landscape = { width: portrait.height, height: portrait.width }
  await page.setViewportSize(landscape)
  await page.evaluate(() => (window as any).rotateCamera())

  for (let i = 0; i < 5; i++) {
    expect(await screenShare(page, 'black')).toBe(0)
  }
  // Once the frames have turned, the preview is framed the same way as before.
  expect(await screenShare(page, 'yellow')).toBeCloseTo(
    coveredSquareShare({ width: 640, height: 480 }, landscape),
    2,
  )
})

test('the camera preview is already the shape of the screen', async ({ page }) => {
  // Safari may not refit a canvas when only its pixel size changes, so the
  // preview never leans on object-fit: its pixels match its box's shape.
  await rotatingCamera(page)
  await page.goto('/#ekohilas')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.loading-overlay', { state: 'hidden' })

  const shapes = () =>
    page.locator('.camera-preview').evaluate((canvas: HTMLCanvasElement) => ({
      pixels: canvas.width / canvas.height,
      box: canvas.clientWidth / canvas.clientHeight,
    }))

  const portrait = await shapes()
  expect(portrait.pixels).toBeCloseTo(portrait.box, 2)

  const { width, height } = page.viewportSize()!
  await page.setViewportSize({ width: height, height: width })
  await page.evaluate(() => (window as any).rotateCamera())
  await expect.poll(async () => {
    const { pixels, box } = await shapes()
    return Math.abs(pixels - box) < 0.01 && box > 1
  }).toBe(true)
})
