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
  // iOS pins the camera frames to the phone's natural portrait orientation, so
  // in landscape they arrive a quarter turn out and portrait-shaped.
  const portraitCamera = async (page: Page) => {
    await page.addInitScript(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 480
      canvas.height = 640
      const ctx = canvas.getContext('2d')!
      const draw = () => {
        ctx.fillStyle = '#87CEEB'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#DC143C'
        ctx.fillRect(40, 40, 160, 80)
      }
      draw()
      setInterval(draw, 100)
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: () => Promise.resolve(canvas.captureStream(30)) },
        writable: true,
        configurable: true,
      })
    })
  }

  /** A settable orientation angle, as the phone reports while being turned. */
  const fakeOrientation = async (page: Page) => {
    await page.addInitScript(() => {
      Object.defineProperty(screen.orientation, 'angle', {
        get: () => (window as unknown as { __angle?: number }).__angle ?? 0,
        configurable: true,
      })
    })
  }

  const openCamera = async (page: Page) => {
    await page.goto('/#ekohilas')
    await page.waitForSelector('.qr-code')
    await page.click('.qr-code-wrapper')
    await page.waitForSelector('.loading-overlay', { state: 'hidden' })
  }

  const turnSideways = async (page: Page, angle = 90) => {
    await page.evaluate((a) => {
      ;(window as unknown as { __angle?: number }).__angle = a
    }, angle)
    await page.setViewportSize({ width: 731, height: 411 })
    await expect(page.locator('.camera-video')).toHaveAttribute('style', /./)
  }

  test('turning the phone after the camera opens spins the preview back', async ({
    page,
  }) => {
    await portraitCamera(page)
    await fakeOrientation(page)
    await openCamera(page)

    const preview = page.locator('.camera-video')
    // Upright to begin with: the frame and the screen are both portrait.
    await expect(preview).not.toHaveAttribute('style', /rotate\(9|rotate\(2/)

    await turnSideways(page)
    await expect(preview).toHaveAttribute('style', /rotate\(90deg\)/)
    // The mirror stays outermost so the viewer is still flipped left to right.
    await expect(preview).toHaveAttribute('style', /scaleX\(-1\) rotate/)

    // The box swaps with the axes, so the preview still covers the screen
    // rather than being blown up and cropped to a slice of the frame.
    const size = await preview.evaluate((video) => ({
      width: (video as HTMLElement).offsetWidth,
      height: (video as HTMLElement).offsetHeight,
    }))
    expect(size).toEqual({ width: 411, height: 731 })
  })

  test('turning the other way spins the preview the other way', async ({ page }) => {
    await portraitCamera(page)
    await fakeOrientation(page)
    await openCamera(page)
    await turnSideways(page, 270)
    await expect(page.locator('.camera-video')).toHaveAttribute(
      'style',
      /rotate\(270deg\)/,
    )
  })

  test('a photo taken sideways is stored the right way up', async ({ page }) => {
    await portraitCamera(page)
    await fakeOrientation(page)
    await openCamera(page)
    await turnSideways(page)
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
    // The 480x640 frame lands upright rather than on its side.
    expect(size).toEqual({ width: 640, height: 480 })
  })

  test('a phone that will not report its angle is still spun upright', async ({
    page,
  }) => {
    // Whatever the phone claims, a portrait frame on a landscape screen is a
    // quarter turn out; leaving it sideways is not an option.
    await portraitCamera(page)
    await page.addInitScript(() => {
      Object.defineProperty(screen.orientation, 'angle', {
        get: () => 0,
        configurable: true,
      })
      delete (window as unknown as { orientation?: number }).orientation
    })
    await openCamera(page)
    await page.setViewportSize({ width: 731, height: 411 })

    await expect(page.locator('.camera-video')).toHaveAttribute(
      'style',
      /rotate\(90deg\)/,
    )
  })

  test('a frame that already matches the screen is left alone', async ({ page }) => {
    // What every engine other than iOS hands over: the frame turns with the
    // interface, so there is nothing to correct.
    await fakeCamera(page)
    await fakeOrientation(page)
    await openCamera(page)
    await turnSideways(page)

    await expect(page.locator('.camera-video')).not.toHaveAttribute(
      'style',
      /rotate\(9|rotate\(2/,
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
