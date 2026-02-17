import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import './CameraScreen.css';

interface CameraScreenProps {
  onCapture: () => void;
}

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
        setIsLoading(false);
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

  const capturePhoto = async () => {
    if (!videoRef || !canvasRef || isCapturing()) return;
    
    setIsCapturing(true);

    try {
      // Draw video frame to canvas
      const context = canvasRef.getContext('2d');
      if (!context) throw new Error('Canvas context not available');

      canvasRef.width = videoRef.videoWidth;
      canvasRef.height = videoRef.videoHeight;
      context.drawImage(videoRef, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef!.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.95
        );
      });

      // Create file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `linkedin-selfie-${timestamp}.jpg`, { 
        type: 'image/jpeg' 
      });

      // Try Web Share API first (mobile devices)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'LinkedIn Selfie',
          text: 'My LinkedIn connection selfie'
        });
      } else {
        // Fallback: download link (desktop browsers)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `linkedin-selfie-${timestamp}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Return to QR screen
      props.onCapture();
    } catch (err) {
      console.error('Capture error:', err);
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to save photo. Please try again.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div class="camera-screen">
      <Show when={error()}>
        <div class="error-overlay">
          <p>{error()}</p>
          <button onClick={props.onCapture}>Go Back</button>
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
