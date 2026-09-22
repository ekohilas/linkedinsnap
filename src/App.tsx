import { createSignal, Show, onMount, onCleanup } from 'solid-js'
import { QRScreen } from './components/QRScreen'
import { CameraScreen } from './components/CameraScreen'
import { GalleryScreen } from './components/GalleryScreen'
import './App.css'

type View = 'qr' | 'camera' | 'gallery';

function App() {
  const [view, setView] = createSignal<View>('qr');

  // Short trips away (the share sheet, a quick app switch) should leave the
  // current screen alone; coming back to the app later starts at the QR again.
  const RESET_AFTER_MS = 60_000;
  let hiddenAt = 0;

  // Reset to QR screen when the app is picked back up
  onMount(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > RESET_AFTER_MS) {
        setView('qr');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    onCleanup(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  });

  return (
    <div class="app">
      <Show when={view() === 'qr'}>
        <QRScreen onTap={() => setView('camera')} onGallery={() => setView('gallery')} />
      </Show>
      <Show when={view() === 'camera'}>
        <CameraScreen onCapture={() => setView('gallery')} onBack={() => setView('qr')} />
      </Show>
      <Show when={view() === 'gallery'}>
        <GalleryScreen onQR={() => setView('qr')} onCamera={() => setView('camera')} />
      </Show>
    </div>
  )
}

export default App
