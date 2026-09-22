import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { addPhoto } from '../utils/photos';
import { previewRotation } from '../utils/orientation';
import './CameraScreen.css';

interface CameraScreenProps {
  onCapture: () => void;
  onBack: () => void;
}

/** Keeps stored photos small enough for the localStorage budget. */
const MAX_STORED_WIDTH = 800;
const STORED_QUALITY = 0.75;

export function CameraScreen(props: CameraScreenProps) {
  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let screenRef: HTMLDivElement | undefined;
  let streamRef: MediaStream | undefined;

  const [error, setError] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(true);
  const [isCapturing, setIsCapturing] = createSignal(false);
  const [rotation, setRotation] = createSignal(0);
  const [screenSize, setScreenSize] = createSignal({ width: 0, height: 0 });

  // The preview has to be spun back whenever the interface turns underneath it.
  onMount(() => {
    const sync = () => {
      setRotation(previewRotation());
      setScreenSize({
        width: screenRef?.clientWidth ?? 0,
        height: screenRef?.clientHeight ?? 0,
      });
    };

    sync();
    screen.orientation?.addEventListener('change', sync);
    // Older iOS only fires the window-level event.
    window.addEventListener('orientationchange', sync);
    // Safari lands the new viewport size a beat after the rotation event.
    window.addEventListener('resize', sync);

    onCleanup(() => {
      screen.orientation?.removeEventListener('change', sync);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('resize', sync);
    });
  });

  /**
   * A quarter turn swaps the preview's axes, so the box has to swap with it to
   * keep covering the screen once the rotation is applied.
   */
  const previewStyle = () => {
    const turn = rotation();
    if (turn === 0) return undefined;

    // The mirror goes on last so it still flips what the viewer sees as
    // left-to-right, whichever way the preview has been spun.
    const style: Record<string, string> = { transform: `scaleX(-1) rotate(${turn}deg)` };
    const { width, height } = screenSize();
    if (turn % 180 !== 0 && width && height) {
      style.width = `${height}px`;
      style.height = `${width}px`;
    }
    return style;
  };

  onMount(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      
      streamRef = stream;
      if (videoRef) {
        videoRef.srcObject = stream;
        videoRef.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
      setIsLoading(false);
    }
  });

  onCleanup(() => {
    if (streamRef) {
      streamRef.getTracks().forEach(track => track.stop());
    }
  });

  const capturePhoto = () => {
    // Nothing to draw until the first frame has landed.
    if (!videoRef || !canvasRef || isLoading() || isCapturing()) return;
    
    setIsCapturing(true);

    try {
      // Draw video frame to canvas, scaled down so the roll fits in storage
      const context = canvasRef.getContext('2d');
      if (!context) throw new Error('Canvas context not available');

      // Store the photo the way up the viewer framed it, not the way up the
      // camera happened to hand the frame over.
      const turn = rotation();
      const quarterTurn = turn % 180 !== 0;
      const storedWidth = quarterTurn ? videoRef.videoHeight : videoRef.videoWidth;
      const scale = Math.min(1, MAX_STORED_WIDTH / storedWidth);
      const frameWidth = Math.round(videoRef.videoWidth * scale);
      const frameHeight = Math.round(videoRef.videoHeight * scale);
      canvasRef.width = quarterTurn ? frameHeight : frameWidth;
      canvasRef.height = quarterTurn ? frameWidth : frameHeight;

      context.translate(canvasRef.width / 2, canvasRef.height / 2);
      context.rotate((turn * Math.PI) / 180);
      context.drawImage(videoRef, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);

      // Keep the photo in localStorage so the gallery survives a reload
      addPhoto(canvasRef.toDataURL('image/jpeg', STORED_QUALITY));
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
      // Always show the gallery after a capture attempt
      props.onCapture();
    }
  };

  return (
    <div class="camera-screen" ref={screenRef}>
      <Show when={error()}>
        <div class="error-overlay">
          <p>{error()}</p>
          <button onClick={props.onBack}>Go Back</button>
        </div>
      </Show>

      <Show when={isLoading()}>
        <div class="loading-overlay">
          <p>Loading camera...</p>
        </div>
      </Show>

      <video 
        ref={videoRef}
        class="camera-video"
        style={previewStyle()}
        onClick={capturePhoto}
        onLoadedData={() => setIsLoading(false)}
        autoplay
        playsinline
        muted
      />

      <canvas ref={canvasRef} style="display: none;" />

      <div class="camera-overlay">
        <div class="tap-instruction">
          👆 Tap to capture
        </div>
      </div>

      <Show when={isCapturing()}>
        <div class="capture-flash" />
      </Show>
    </div>
  );
}
