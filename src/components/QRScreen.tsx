import { createSignal, createEffect, Show } from 'solid-js';
import QRCode from 'qrcode';
import { useHashParam } from '../hooks/useHashParam';
import { extractUsername } from '../utils/username';
import './QRScreen.css';

interface QRScreenProps {
  onTap: () => void;
}

export function QRScreen(props: QRScreenProps) {
  const username = useHashParam();
  const [qrDataUrl, setQrDataUrl] = createSignal('');
  const [error, setError] = createSignal('');
  const [usernameInput, setUsernameInput] = createSignal('');

  const targetHash = () => `#${extractUsername(usernameInput())}`;

  const handlePaste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    const extracted = extractUsername(pasted);
    // Only take over the paste when there was a URL to unwrap.
    if (extracted === pasted.trim()) return;
    event.preventDefault();
    setUsernameInput(extracted);
  };

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const hash = targetHash();
    if (hash === '#') return;
    window.location.hash = hash;
  };

  createEffect(async () => {
    const user = username();
    if (user) {
      try {
        const url = `https://linkedin.com/in/${user}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
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
            <p>
              <label for="username-input">Enter your LinkedIn username:</label>
            </p>
            <form class="username-form" onSubmit={handleSubmit}>
              <span class="username-prefix">#</span>
              <input
                id="username-input"
                class="username-input"
                type="text"
                name="username"
                value={usernameInput()}
                onInput={(event) => setUsernameInput(event.currentTarget.value)}
                onPaste={handlePaste}
                placeholder="username or URL"
                autocapitalize="none"
                autocorrect="off"
                spellcheck={false}
                enterkeyhint="go"
              />
              <button
                class="username-submit"
                type="submit"
                disabled={targetHash() === '#'}
                aria-label="Show QR code"
              >
                →
              </button>
            </form>
            <p class="example">Example: #ekohilas</p>
            <details class="help">
              <summary class="help-toggle">Need help?</summary>
              <ol class="help-steps">
                <li>
                  Click{' '}
                  <a
                    class="help-link"
                    href="https://linkedin.com/in/me"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    linkedin.com/in/me
                  </a>
                </li>
                <li>Navigate to your contact info to find your URL</li>
                <li>Paste the URL above</li>
              </ol>
            </details>
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
