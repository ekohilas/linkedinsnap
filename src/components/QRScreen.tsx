import { createSignal, createEffect, Show } from 'solid-js';
import QRCode from 'qrcode';
import { useHashParam } from '../hooks/useHashParam';
import './QRScreen.css';

interface QRScreenProps {
  onTap: () => void;
}

export function QRScreen(props: QRScreenProps) {
  const username = useHashParam();
  const [qrDataUrl, setQrDataUrl] = createSignal('');
  const [error, setError] = createSignal('');

  createEffect(async () => {
    const user = username();
    if (user) {
      try {
        const url = `https://linkedin.com/in/${user}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: {
            dark: '#0a66c2',
            light: '#ffffff'
          }
        });
        setQrDataUrl(dataUrl);
        setError('');
      } catch (err) {
        setError('Failed to generate QR code');
        console.error(err);
      }
    } else {
      setQrDataUrl('');
      setError('');
    }
  });

  return (
    <div class="qr-screen">
      <Show
        when={username()}
        fallback={
          <div class="qr-instructions">
            <h1>LinkedInSnap</h1>
            <p>Add your LinkedIn username to the URL:</p>
            <code>#{'{'}username{'}'}</code>
            <p class="example">Example: #ekohilas</p>
          </div>
        }
      >
        <div class="qr-container">
          <h2>@{username()}</h2>
          <Show when={qrDataUrl() && !error()}>
            <div class="qr-code-wrapper" onClick={props.onTap}>
              <img src={qrDataUrl()} alt="LinkedIn QR Code" class="qr-code" />
              <p class="tap-hint">👆 Tap to take a selfie</p>
            </div>
          </Show>
          <Show when={error()}>
            <p class="error">{error()}</p>
          </Show>
        </div>
      </Show>
    </div>
  );
}
