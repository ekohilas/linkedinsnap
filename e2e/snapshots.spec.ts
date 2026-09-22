import { test, expect, type Page } from '@playwright/test'

const fakeCamera = async (page: Page) => {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')

    const drawScene = () => {
      if (!ctx) return
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

    drawScene()
    // A capture stream only emits while the canvas is being painted.
    setInterval(drawScene, 100)

    Object.defineProperty(navigator, 'mediaDevices', {
      // A fresh stream per call: the screen stops its tracks when it unmounts.
      value: { getUserMedia: () => Promise.resolve(canvas.captureStream(30)) },
      writable: true,
      configurable: true,
    })
  })
}

test('QR instructions view', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('qr-instructions.png')
})

test('username field navigates to the QR code view', async ({ page }) => {
  await page.goto('/')
  await page.fill('.username-input', 'ekohilas')
  await page.click('.username-submit')
  await page.waitForSelector('.qr-code')
  expect(new URL(page.url()).hash).toBe('#ekohilas')
})

test('help menu unzips the steps', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.help-steps')).toBeHidden()
  await page.click('.help-toggle')
  await expect(page.locator('.help-steps li')).toHaveCount(3)
  await expect(page.locator('.help-link')).toHaveAttribute(
    'href',
    'https://linkedin.com/in/me',
  )
  await expect(page).toHaveScreenshot('qr-help.png')
})

test('pasting a profile URL extracts the username', async ({ page }) => {
  const urls = [
    'https://www.linkedin.com/in/ekohilas/',
    'https://linkedin.com/in/ekohilas?originalSubdomain=au',
    'linkedin.com/in/ekohilas',
  ]

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  for (const url of urls) {
    await page.fill('.username-input', '')
    await page.locator('.username-input').focus()
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text)
    }, url)
    await page.keyboard.press('ControlOrMeta+V')
    await expect(page.locator('.username-input')).toHaveValue('ekohilas')
  }

  await page.click('.username-submit')
  await page.waitForSelector('.qr-code')
  expect(new URL(page.url()).hash).toBe('#ekohilas')
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
  await fakeCamera(page)
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.loading-overlay', { state: 'hidden' })
  await expect(page).toHaveScreenshot('camera-ready.png')
})

test('the QR screen opens the gallery', async ({ page }) => {
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await page.click('.nav-gallery')
  await expect(page.locator('.gallery-empty')).toBeVisible()
  await expect(page).toHaveScreenshot('gallery-empty.png')
})

test.describe('gallery with photos', () => {
  // Captions carry the capture time: pin the clock's formatting for snapshots.
  test.use({ timezoneId: 'UTC', locale: 'en-US' })

  test('a capture is stored and shown in the gallery', async ({ page }) => {
    await fakeCamera(page)
    await page.goto('/#ekohilas')
    await page.waitForSelector('.qr-code')
    await page.click('.qr-code-wrapper')
    await page.waitForSelector('.loading-overlay', { state: 'hidden' })
    await page.click('.camera-video')

    await expect(page.locator('.gallery-photo')).toHaveCount(1)
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('linkedinsnap:photos') ?? '[]'),
    )
    expect(stored).toHaveLength(1)
    expect(stored[0].dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true)

    // A second selfie stacks on top of the first.
    await page.click('.nav-camera')
    await page.waitForSelector('.loading-overlay', { state: 'hidden' })
    await page.click('.camera-video')
    await expect(page.locator('.gallery-photo')).toHaveCount(2)

    // Freeze the capture times so the captions are stable across runs.
    await page.evaluate(() => {
      const photos = JSON.parse(
        localStorage.getItem('linkedinsnap:photos') ?? '[]',
      )
      photos.forEach((photo, index) => {
        photo.takenAt = Date.UTC(2026, 0, 2, 3, 4) - index * 60_000
      })
      localStorage.setItem('linkedinsnap:photos', JSON.stringify(photos))
    })
    await page.reload()
    await page.waitForSelector('.qr-code')
    await page.click('.nav-gallery')
    await expect(page.locator('.gallery-photo')).toHaveCount(2)

    await expect(page).toHaveScreenshot('gallery-photos.png')
  })
})

test('the gallery survives a reload', async ({ page }) => {
  await fakeCamera(page)
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await page.click('.qr-code-wrapper')
  await page.waitForSelector('.loading-overlay', { state: 'hidden' })
  await page.click('.camera-video')
  await expect(page.locator('.gallery-photo')).toHaveCount(1)

  await page.reload()
  await page.waitForSelector('.qr-code')
  await page.click('.nav-gallery')
  await expect(page.locator('.gallery-photo')).toHaveCount(1)
})

test('the gallery navigates back to the QR code and the camera', async ({ page }) => {
  await fakeCamera(page)
  await page.goto('/#ekohilas')
  await page.waitForSelector('.qr-code')
  await page.click('.nav-gallery')

  await page.click('.nav-qr')
  await expect(page.locator('.qr-code')).toBeVisible()

  await page.click('.nav-gallery')
  await page.click('.nav-camera')
  await expect(page.locator('.camera-video')).toBeVisible()
})

test.describe('a sideways phone', () => {
  const IPHONE_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

  // iOS pins the camera frames to the device, so the preview needs spinning
  // back once the interface turns; the landscape viewport matches the angle.
  test.use({ viewport: { width: 731, height: 411 } })

  const turnSideways = async (page: Page) => {
    await page.addInitScript(() => {
      Object.defineProperty(screen.orientation, 'angle', { get: () => 90 })
    })
  }

  const openCamera = async (page: Page) => {
    await page.goto('/#ekohilas')
    await page.waitForSelector('.qr-code')
    await page.click('.qr-code-wrapper')
    await page.waitForSelector('.loading-overlay', { state: 'hidden' })
  }

  test.describe('on iOS', () => {
    test.use({ userAgent: IPHONE_UA })

    test('the preview is spun back to match the interface', async ({ page }) => {
      await fakeCamera(page)
      await turnSideways(page)
      await openCamera(page)

      const preview = page.locator('.camera-video')
      await expect(preview).toHaveAttribute('style', /rotate\(90deg\)/)
      // The mirror stays outermost so the viewer is still flipped left to right.
      await expect(preview).toHaveAttribute('style', /scaleX\(-1\) rotate/)

      // A quarter turn swaps the axes, so the box swaps to keep covering.
      const box = await preview.evaluate((video) => ({
        width: (video as HTMLElement).offsetWidth,
        height: (video as HTMLElement).offsetHeight,
      }))
      expect(box).toEqual({ width: 411, height: 731 })
    })

    test('a photo taken sideways is stored the right way up', async ({ page }) => {
      await fakeCamera(page)
      await turnSideways(page)
      await openCamera(page)
      await page.click('.camera-video')

      await expect(page.locator('.gallery-photo')).toHaveCount(1)
      const size = await page.evaluate(async () => {
        const [photo] = JSON.parse(
          localStorage.getItem('linkedinsnap:photos') ?? '[]',
        )
        const image = new Image()
        image.src = photo.dataUrl
        await image.decode()
        return { width: image.naturalWidth, height: image.naturalHeight }
      })
      // The 640x480 camera frame lands upright rather than on its side.
      expect(size).toEqual({ width: 480, height: 640 })
    })
  })

  test('other engines already orient the frames, so they are left alone', async ({
    page,
  }) => {
    await fakeCamera(page)
    await turnSideways(page)
    await openCamera(page)

    await expect(page.locator('.camera-video')).not.toHaveAttribute(
      'style',
      /rotate/,
    )
    await page.click('.camera-video')
    const size = await page.evaluate(async () => {
      const [photo] = JSON.parse(
        localStorage.getItem('linkedinsnap:photos') ?? '[]',
      )
      const image = new Image()
      image.src = photo.dataUrl
      await image.decode()
      return { width: image.naturalWidth, height: image.naturalHeight }
    })
    expect(size).toEqual({ width: 640, height: 480 })
  })
})
