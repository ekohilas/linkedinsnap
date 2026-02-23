import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@solidjs/testing-library'
import { CameraScreen } from '../components/CameraScreen'

const mockGetUserMedia = vi.fn()
const mockStream = { getTracks: () => [] } as unknown as MediaStream

beforeEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  })
  // Suppress jsdom play() not implemented warning
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
})

describe('CameraScreen', () => {
  it('shows loading state initially', async () => {
    let resolve!: (stream: MediaStream) => void
    mockGetUserMedia.mockReturnValue(new Promise<MediaStream>(r => { resolve = r }))
    const { container } = render(() => <CameraScreen onCapture={() => {}} />)
    expect(screen.getByText('Loading camera...')).toBeTruthy()
    expect(container).toMatchSnapshot()
    // Resolve to avoid unhandled promise warnings
    resolve(mockStream)
  })

  it('shows error state when camera access is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    const { container } = render(() => <CameraScreen onCapture={() => {}} />)
    await screen.findByText('Unable to access camera. Please grant camera permissions.')
    expect(container).toMatchSnapshot()
  })

  it('shows camera view when access is granted', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)
    const { container } = render(() => <CameraScreen onCapture={() => {}} />)
    await waitFor(() => expect(screen.queryByText('Loading camera...')).toBeNull())
    expect(container).toMatchSnapshot()
  })
})
