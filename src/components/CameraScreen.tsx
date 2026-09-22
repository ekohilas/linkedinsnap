import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { addPhoto } from '../utils/photos';
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
  let streamRef: MediaStream | undefined;

  const [error, setError] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(true);
  const [isCapturing, setIsCapturing] = createSignal(false);

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

      const scale = Math.min(1, MAX_STORED_WIDTH / videoRef.videoWidth);
      canvasRef.width = Math.round(videoRef.videoWidth * scale);
      canvasRef.height = Math.round(videoRef.videoHeight * scale);
      context.drawImage(videoRef, 0, 0, canvasRef.width, canvasRef.height);

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
    <div class="camera-screen">
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
