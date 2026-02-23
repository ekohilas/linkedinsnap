import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@solidjs/testing-library'
import App from '../App'

const mockToDataURL = vi.hoisted(() => vi.fn())
const mockGetUserMedia = vi.fn()

vi.mock('qrcode', () => ({
  default: { toDataURL: mockToDataURL },
}))

beforeEach(() => {
  window.location.hash = ''
  mockToDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  })
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  mockGetUserMedia.mockReturnValue(new Promise(() => {}))
})

describe('App', () => {
  it('shows QR instructions when no username is set', () => {
    const { container } = render(() => <App />)
    expect(container).toMatchSnapshot()
  })

  it('shows QR code when a username is set', async () => {
    window.location.hash = '#ekohilas'
    const { container } = render(() => <App />)
    await screen.findByAltText('LinkedIn QR Code')
    expect(container).toMatchSnapshot()
  })

  it('switches to camera screen when QR code is tapped', async () => {
    window.location.hash = '#ekohilas'
    const { container } = render(() => <App />)
    await screen.findByAltText('LinkedIn QR Code')
    fireEvent.click(screen.getByAltText('LinkedIn QR Code'))
    expect(screen.getByText('Loading camera...')).toBeTruthy()
    expect(container).toMatchSnapshot()
  })
})
