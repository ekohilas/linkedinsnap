import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import { QRScreen } from '../components/QRScreen'

const mockToDataURL = vi.hoisted(() => vi.fn())

vi.mock('qrcode', () => ({
  default: { toDataURL: mockToDataURL },
}))

describe('QRScreen', () => {
  beforeEach(() => {
    window.location.hash = ''
    mockToDataURL.mockResolvedValue('data:image/png;base64,mockqrcode')
  })

  it('shows instructions when no username is set', () => {
    const { container } = render(() => <QRScreen onTap={() => {}} />)
    expect(container).toMatchSnapshot()
  })

  it('shows QR code when a username is set', async () => {
    window.location.hash = '#ekohilas'
    const { container } = render(() => <QRScreen onTap={() => {}} />)
    await screen.findByAltText('LinkedIn QR Code')
    expect(container).toMatchSnapshot()
  })

  it('shows error when QR code generation fails', async () => {
    mockToDataURL.mockRejectedValueOnce(new Error('QR generation failed'))
    window.location.hash = '#ekohilas'
    const { container } = render(() => <QRScreen onTap={() => {}} />)
    await screen.findByText('Failed to generate QR code')
    expect(container).toMatchSnapshot()
  })
})
