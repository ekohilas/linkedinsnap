import { createSignal, For, Show } from 'solid-js';
import { loadPhotos } from '../utils/photos';
import { NavBar, NavButton } from './NavBar';
import { CameraIcon, QRIcon } from './icons';
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

export function GalleryScreen(props: GalleryScreenProps) {
  const [photos] = createSignal(loadPhotos());

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
              <figure class="gallery-item">
                <img
                  class="gallery-photo"
                  src={photo.dataUrl}
                  alt={`Selfie taken ${formatTaken(photo.takenAt)}`}
                  onClick={() => sharePhoto(photo.dataUrl, photo.takenAt)}
                />
                <figcaption class="gallery-caption">
                  {formatTaken(photo.takenAt)}
                </figcaption>
              </figure>
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
