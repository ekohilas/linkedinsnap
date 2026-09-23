interface Size {
  width: number;
  height: number;
}

/**
 * iOS hands out `getUserMedia` frames in the phone's natural (portrait)
 * orientation and keeps them there however the interface turns. Sideways,
 * that leaves the preview a quarter turn out of step with the UI *and*
 * portrait-shaped inside a landscape box, which `object-fit: cover` then
 * blows up around three times, throwing most of the frame away.
 *
 * A portrait frame in a landscape viewport is the tell. Engines that do
 * re-orient the frames hand over one whose shape already matches, so they
 * never trip this, and no user-agent guesswork is needed to tell them apart.
 * The mirror case — a wide webcam in a tall window — is ordinary and is left
 * alone, which is also why this is limited to touch screens: those are the
 * ones that turn.
 */
export function previewRotation(frame: Size, view: Size): number {
  if (!frame.width || !frame.height || !view.width || !view.height) return 0;
  if (frame.width >= frame.height || view.width <= view.height) return 0;
  if (!matchMedia('(pointer: coarse)').matches) return 0;
  return quarterTurn();
}

/**
 * Which way the phone is being held, in degrees clockwise. Only reached once
 * the frame's shape has already given away that we are a quarter turn out, so
 * a reading that claims otherwise is not usable; landscape-left is the more
 * common grip, so fall back to that rather than leaving the preview sideways.
 */
function quarterTurn(): number {
  // `window.orientation` is the pre-Screen-Orientation-API fallback, and it
  // reports -90 where the modern API says 270.
  const legacy = (window as { orientation?: number }).orientation;
  const raw = screen.orientation?.angle ?? legacy;
  if (typeof raw === 'number') {
    const angle = (((Math.round(raw / 90) * 90) % 360) + 360) % 360;
    if (angle === 90 || angle === 270) return angle;
  }
  return 90;
}
