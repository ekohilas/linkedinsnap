/**
 * iOS hands out `getUserMedia` frames in the device's natural (portrait)
 * orientation and leaves them there, while the page around them rotates with
 * the interface. Turn the phone sideways and the preview ends up a quarter
 * turn out of step with the UI drawn on top of it.
 *
 * Every other engine rotates the frames to match the interface, so the
 * correction has to stay switched off there or it would introduce the very
 * bug it exists to fix.
 */
function framesPinnedToDevice(): boolean {
  const ua = navigator.userAgent;
  // iPadOS claims to be a Mac; the touch points give it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** How far the interface is currently turned, as 0, 90, 180 or 270 degrees clockwise. */
function interfaceAngle(): number {
  // `window.orientation` is the pre-Screen-Orientation-API fallback, and it
  // reports -90 where the modern API says 270.
  const legacy = (window as { orientation?: number }).orientation;
  const raw = screen.orientation?.angle ?? legacy ?? 0;
  return (((Math.round(raw / 90) * 90) % 360) + 360) % 360;
}

/**
 * Degrees the camera frames have to be spun clockwise to line back up with the
 * interface. Zero whenever the frames already arrive the right way up.
 */
export function previewRotation(): number {
  return framesPinnedToDevice() ? interfaceAngle() : 0;
}
