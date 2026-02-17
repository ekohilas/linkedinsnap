import { createSignal, Show } from 'solid-js'
import { QRScreen } from './components/QRScreen'
import { CameraScreen } from './components/CameraScreen'
import './App.css'

type View = 'qr' | 'camera';

function App() {
  const [view, setView] = createSignal<View>('qr');

  return (
    <div class="app">
      <Show when={view() === 'qr'}>
        <QRScreen onTap={() => setView('camera')} />
      </Show>
      <Show when={view() === 'camera'}>
        <CameraScreen onCapture={() => setView('qr')} />
      </Show>
    </div>
  )
}

export default App
