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
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
      // Always return to QR screen after capture attempt
      props.onCapture();
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
        <video
        class="hdr-flash-video"
        muted
        autoplay
        playsinline
        oncanplaythrough="this.currentTime=0"
        poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAAAXNSR0IArs4c6QAAAA5JREFUeNpj+P+fgRQEAP1OH+HeyHWXAAAAAElFTkSuQmCC"
        src="data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAvG1kYXQAAAAfTgEFGkdWStxcTEM/lO/FETzRQ6gD7gAA7gIAA3EYgAAAAEgoAa8iNjAkszOL+e58c//cEe//0TT//scp1n/381P/RWP/zOW4QtxorfVogeh8nQDbQAAAAwAQMCcWUTAAAAMAAAMAAAMA84AAAAAVAgHQAyu+KT35E7gAADFgAAADABLQAAAAEgIB4AiS76MTkNbgAAF3AAAPSAAAABICAeAEn8+hBOTXYAADUgAAHRAAAAPibW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAKcAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAw10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAKcAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAACnAAAAAAABAAAAAAKFbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABdwAAAD6BVxAAAAAAAMWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABDb3JlIE1lZGlhIFZpZGVvAAAAAixtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAHsc3RibAAAARxzdHNkAAAAAAAAAAEAAAEMaHZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAQABAASAAAAEgAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAAHVodmNDAQIgAAAAsAAAAAAAPPAA/P36+gAACwOgAAEAGEABDAH//wIgAAADALAAAAMAAAMAPBXAkKEAAQAmQgEBAiAAAAMAsAAAAwAAAwA8oBQgQcCTDLYgV7kWVYC1CRAJAICiAAEACUQBwChkuNBTJAAAAApmaWVsAQAAAAATY29scm5jbHgACQAQAAkAAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAALPwAACz8AAAAKHN0dHMAAAAAAAAAAwAAAAIAAAPoAAAAAQAAAAEAAAABAAAD6AAAABRzdHNzAAAAAAAAAAEAAAABAAAAEHNkdHAAAAAAIBAQGAAAAChjdHRzAAAAAAAAAAMAAAABAAAAAAAAAAEAAAfQAAAAAgAAAAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAQAAAABAAAAJHN0c3oAAAAAAAAAAAAAAAQAAABvAAAAGQAAABYAAAAWAAAAFHN0Y28AAAAAAAAAAQAAACwAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYwLjMuMTAw"
        ></video>
        {/* <div class="capture-flash" /> */}
      </Show>
    </div>
  );
}
