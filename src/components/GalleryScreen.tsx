import { createSignal, For, Show, type JSX } from 'solid-js';
import { loadPhotos, removePhoto } from '../utils/photos';
import { NavBar, NavButton } from './NavBar';
import { CameraIcon, QRIcon, TrashIcon } from './icons';
import './GalleryScreen.css';

interface GalleryScreenProps {
  onQR: () => void;
  onCamera: () => void;
}

function formatTaken(takenAt: number) {
  return new Date(takenAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function sharePhoto(dataUrl: string, takenAt: number) {
  const timestamp = new Date(takenAt).toISOString().replace(/[:.]/g, '-');
  const name = `linkedin-selfie-${timestamp}.jpg`;

  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], name, { type: 'image/jpeg' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'LinkedIn Selfie',
        text: 'My LinkedIn connection selfie',
      });
      return;
    }

    // Fallback: download link (desktop browsers).
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Share error:', err);
  }
}

/** Movement before a touch commits to either a swipe or a scroll. */
const SWIPE_SLOP = 10;
/** Fraction of the tile's width a swipe must travel to delete. */
const DELETE_THRESHOLD = 0.35;
/** Matches the slide-out transition in GalleryScreen.css. */
const SLIDE_OUT_MS = 200;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: JSX.Element;
}

/**
 * Drags its content left with the pointer, revealing a delete strip. Letting
 * go past the threshold slides the content away and deletes it; anything
 * shorter springs back. Vertical drags are left to the page to scroll.
 */
function SwipeToDelete(props: SwipeToDeleteProps) {
  const [offset, setOffset] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  let pointerId: number | undefined;
  let startX = 0;
  let startY = 0;
  let axis: 'x' | 'y' | undefined;
  let width = 0;
  // A swipe ends in a click on the photo, which would otherwise share it.
  let suppressClick = false;

  const onPointerDown = (e: PointerEvent) => {
    if (deleting() || pointerId !== undefined || !e.isPrimary) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    axis = undefined;
    width = (e.currentTarget as HTMLElement).offsetWidth;
    suppressClick = false;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_SLOP) return;
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        suppressClick = true;
      }
    }

    if (axis === 'x') setOffset(Math.min(0, dx));
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = undefined;
    if (axis !== 'x') return;
    setDragging(false);

    if (e.type === 'pointerup' && -offset() > width * DELETE_THRESHOLD) {
      setDeleting(true);
      setOffset(-width);
      setTimeout(props.onDelete, SLIDE_OUT_MS);
    } else {
      setOffset(0);
    }
  };

  const onClickCapture = (e: MouseEvent) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      class="swipe-item"
      classList={{ 'swipe-item-deleting': deleting() }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      on:click={{ handleEvent: onClickCapture, capture: true }}
    >
      <div
        class="swipe-action"
        classList={{ 'swipe-action-armed': -offset() > width * DELETE_THRESHOLD }}
        aria-hidden="true"
      >
        <TrashIcon />
      </div>
      <div
        class="swipe-content"
        classList={{ 'swipe-content-dragging': dragging() }}
        style={{ transform: `translateX(${offset()}px)` }}
      >
        {props.children}
      </div>
    </div>
  );
}

export function GalleryScreen(props: GalleryScreenProps) {
  const [photos, setPhotos] = createSignal(loadPhotos());

  const deletePhoto = (id: string) => {
    removePhoto(id);
    // Filter the rendered list rather than reloading so the other tiles keep
    // their DOM (and decoded images).
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  };

  return (
    <div class="gallery-screen">
      <header class="gallery-header">
        <h2>Selfies</h2>
      </header>

      <Show
        when={photos().length > 0}
        fallback={
          <div class="gallery-empty">
            <p>No selfies yet.</p>
            <p class="gallery-empty-hint">Tap the camera below to take one.</p>
          </div>
        }
      >
        <div class="gallery-list">
          <For each={photos()}>
            {(photo) => (
              <SwipeToDelete onDelete={() => deletePhoto(photo.id)}>
                <figure class="gallery-item">
                  <img
                    class="gallery-photo"
                    src={photo.dataUrl}
                    alt={`Selfie taken ${formatTaken(photo.takenAt)}`}
                    draggable={false}
                    onClick={() => sharePhoto(photo.dataUrl, photo.takenAt)}
                  />
                  <figcaption class="gallery-caption">
                    {formatTaken(photo.takenAt)}
                  </figcaption>
                </figure>
              </SwipeToDelete>
            )}
          </For>
        </div>
      </Show>

      <NavBar>
        <NavButton label="Show QR code" class="nav-qr" onClick={props.onQR}>
          <QRIcon />
        </NavButton>
        <NavButton label="Take a selfie" class="nav-camera" onClick={props.onCamera}>
          <CameraIcon />
        </NavButton>
      </NavBar>
    </div>
  );
}
