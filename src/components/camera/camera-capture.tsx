'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
}

// Configurable delay to allow Android to release the camera hardware between switches
const CAMERA_RELEASE_DELAY = 700;
// Max time to wait for video metadata + real (non-zero) dimensions
const VIDEO_READY_TIMEOUT = 8000;
// Max time to wait for the <video> element to be mounted
const VIDEO_ELEMENT_TIMEOUT = 3000;

// Translate a getUserMedia failure into a human-readable, actionable message
function describeCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Permiso de cámara denegado. Permite el acceso a la cámara en la configuración de tu navegador.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se encontró cámara en este dispositivo. Intenta seleccionar fotos desde la galería.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'La cámara está ocupada por otra aplicación. Cierra la otra app e intenta de nuevo.';
      case 'OverconstrainedError':
        return 'La configuración solicitada no es compatible con la cámara disponible.';
      case 'AbortError':
        return 'La cámara no pudo iniciarse (AbortError). Intenta de nuevo.';
      default:
        return `No se pudo acceder a la cámara (${err.name}).`;
    }
  }
  return 'No se pudo acceder a la cámara. Intenta seleccionar fotos desde la galería.';
}

// Wait until the video element has loaded metadata AND non-zero dimensions.
// Rejects with a code describing the exact failure so we can diagnose it.
function waitForVideoReady(
  video: HTMLVideoElement,
  timeoutMs = VIDEO_READY_TIMEOUT
): Promise<void> {
  return new Promise((resolve, reject) => {
    const hasDimensions = () => video.videoWidth > 0 && video.videoHeight > 0;

    // Already ready
    if (video.readyState >= 1 && hasDimensions()) {
      resolve();
      return;
    }

    let settled = false;
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', check);
      video.removeEventListener('loadeddata', check);
      video.removeEventListener('canplay', check);
      clearTimeout(timer);
    };
    const check = () => {
      if (settled) return;
      if (hasDimensions()) {
        settled = true;
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      if (video.readyState < 1) reject(new Error('METADATA_MISSING'));
      else if (!hasDimensions()) reject(new Error('ZERO_DIMENSIONS'));
      else resolve();
    }, timeoutMs);

    video.addEventListener('loadedmetadata', check);
    video.addEventListener('loadeddata', check);
    video.addEventListener('canplay', check);
  });
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Lock: prevents concurrent camera switches
  const switchingRef = useRef(false);
  // Request ID: discards stale getUserMedia responses from older init calls
  const requestIdRef = useRef(0);

  // Completely release the current camera: stop all tracks, pause video, null srcObject
  const releaseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error al detener track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (e) {
        console.warn('Error al pausar video:', e);
      }
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  }, []);

  // Controlled connection: wait for the <video> element to be mounted if needed
  const waitForVideoElement = useCallback(
    async (timeoutMs = VIDEO_ELEMENT_TIMEOUT): Promise<HTMLVideoElement | null> => {
      if (videoRef.current) return videoRef.current;
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (videoRef.current) return videoRef.current;
      }
      return videoRef.current;
    },
    []
  );

  // Start camera with a unique request ID to avoid stale responses
  const startCamera = useCallback(
    async (targetFacingMode: 'user' | 'environment') => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      setIsVideoReady(false);

      // Never leave a previous stream open without being connected
      releaseCamera();

      let mediaStream: MediaStream | null = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (err) {
        // Only surface the error if this is still the latest request
        if (requestId !== requestIdRef.current) return;
        setError(describeCameraError(err));
        setLoading(false);
        return;
      }

      // Discard if a newer request has already started — stop the orphan stream
      if (requestId !== requestIdRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;

      // The <video> element stays mounted permanently, but guard anyway
      const video = await waitForVideoElement();
      if (requestId !== requestIdRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === mediaStream) streamRef.current = null;
        return;
      }
      if (!video) {
        mediaStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setError('No se pudo preparar el elemento de video. Intenta de nuevo.');
        setLoading(false);
        return;
      }

      // Connect the stream to the (already mounted) video element
      video.srcObject = mediaStream;

      // Wait for loadedmetadata and non-zero videoWidth/videoHeight
      try {
        await waitForVideoReady(video);
      } catch (metaErr) {
        if (requestId !== requestIdRef.current) return;
        const reason = metaErr instanceof Error ? metaErr.message : '';
        if (reason === 'ZERO_DIMENSIONS') {
          setError(
            'El video recibió el flujo pero sus dimensiones son cero. Intenta de nuevo o cambia de cámara.'
          );
        } else {
          setError('El video no recibió metadata de la cámara. Intenta de nuevo o cambia de cámara.');
        }
        setLoading(false);
        return;
      }

      if (requestId !== requestIdRef.current) return;

      // Play and confirm real playback (do not report ready until it is actually playing)
      let playing = false;
      for (let attempt = 0; attempt < 5 && !playing; attempt++) {
        if (requestId !== requestIdRef.current) return;
        try {
          await video.play();
          playing = !video.paused && video.videoWidth > 0 && video.videoHeight > 0;
        } catch (playErr) {
          if (attempt === 4) {
            console.warn('video.play() falló tras 5 intentos:', playErr);
          }
        }
        if (!playing) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        }
      }

      if (requestId !== requestIdRef.current) return;

      if (!playing) {
        setError('No se pudo reproducir el video de la cámara. Intenta de nuevo o cambia de cámara.');
        setLoading(false);
        return;
      }

      setIsVideoReady(true);
      setLoading(false);
    },
    [releaseCamera, waitForVideoElement]
  );

  // Initialize camera when component mounts — single initialization point
  useEffect(() => {
    setOrientation(getOrientation());
    startCamera('environment');

    return () => {
      releaseCamera();
    };
  }, [startCamera, releaseCamera]);

  // Listen for orientation changes - allow device to rotate freely
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(getOrientation());
    };

    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      if (typeof screen !== 'undefined' && screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Sequential camera switch: release current → wait → start new on the same <video>
  const switchCamera = useCallback(async () => {
    // Prevent concurrent switches
    if (switchingRef.current) return;
    switchingRef.current = true;

    try {
      // Clear any captured photo
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setCapturedBlob(null);
      setCountdown(null);

      // Determine the new facing mode
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);

      // Step 1: Fully release the current camera (stop tracks, pause, detach srcObject)
      releaseCamera();

      // Step 2: Wait for Android to release the hardware device
      await new Promise((resolve) => setTimeout(resolve, CAMERA_RELEASE_DELAY));

      // Step 3: Start the new camera; it connects to the SAME video element
      await startCamera(newMode);
    } finally {
      switchingRef.current = false;
    }
  }, [facingMode, previewUrl, releaseCamera, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // In landscape, swap width/height for front camera to match natural orientation
    if (facingMode === 'user' && orientation === 'landscape') {
      canvas.width = video.videoHeight;
      canvas.height = video.videoWidth;
    } else {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror and rotate front-facing camera for natural UX
    if (facingMode === 'user') {
      if (orientation === 'landscape') {
        // Rotate 90 degrees and mirror for landscape front camera
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
        ctx.scale(-1, 1);
      } else {
        // Just mirror for portrait front camera
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [facingMode, orientation]);

  const confirmCapture = useCallback(() => {
    if (!capturedBlob) return;
    releaseCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onCapture(capturedBlob);
  }, [onCapture, capturedBlob, previewUrl, releaseCamera]);

  const retake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  }, [previewUrl, startCamera, facingMode]);

  const handleCancel = useCallback(() => {
    releaseCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    onCancel();
  }, [onCancel, previewUrl, releaseCamera]);

  const startCountdown = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      capturePhoto();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, capturePhoto]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden relative" style={{ position: 'fixed', inset: 0 }}>
      {/* Video/Preview area - the <video> element stays mounted permanently */}
      <div className="absolute inset-0 bg-black">
        {/* The <video> is never unmounted: it is hidden with visibility/opacity, never display:none */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            videoRef.current?.play().catch(() => {});
          }}
          className={`absolute inset-0 w-full h-full object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
          style={{
            display: 'block',
            visibility: previewUrl ? 'hidden' : 'visible',
            opacity: previewUrl ? 0 : isVideoReady ? 1 : 0,
            objectPosition: 'center center',
            transition: 'opacity 200ms ease',
          }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Captured preview overlays the live video */}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Vista previa"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}

        {/* Countdown overlay */}
        {!previewUrl && countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-8xl font-bold text-white/80 animate-pulse">{countdown}</div>
          </div>
        )}

        {/* Loading indicator is a visual layer on top of the mounted video */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="text-white/70 text-sm">Iniciando cámara...</div>
          </div>
        )}
      </div>

      {/* UI Overlay - buttons stay fixed regardless of orientation */}
      {!previewUrl && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 55 }}>
          {/* Cancel button at top left */}
          {!loading && (
            <button
              onClick={handleCancel}
              className="absolute top-8 left-4 pointer-events-auto text-white/80 hover:text-white active:bg-black/60 bg-black/30 hover:bg-black/50 rounded-full p-2.5 transition-colors"
              style={{ touchAction: 'manipulation', zIndex: 60 }}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          {/* Side controls - right side, vertically stacked like native camera */}
          {!loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 pointer-events-auto" style={{ zIndex: 60 }}>
              {/* Switch camera button */}
              <button
                onClick={switchCamera}
                disabled={!!error || loading}
                className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 active:bg-black/60 text-white/80 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                style={{ touchAction: 'manipulation' }}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
              </button>

              {/* Timer button */}
              <button
                onClick={startCountdown}
                disabled={!!error || loading}
                className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 active:bg-black/60 text-white/80 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 text-lg"
                style={{ touchAction: 'manipulation' }}
                type="button"
                title="Temporizador 3s"
              >
                ⏱
              </button>
            </div>
          )}

          {/* Capture button - centered at bottom */}
          {!loading && (
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center pointer-events-auto" style={{ zIndex: 60 }}>
              <button
                onClick={capturePhoto}
                disabled={!!error || loading}
                className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg border-4 border-white/30"
                style={{ touchAction: 'manipulation' }}
                type="button"
              >
                <div className="w-16 h-16 rounded-full border-2 border-gray-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview mode controls - overlay at bottom */}
      {previewUrl && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-8 px-4" style={{ zIndex: 60 }}>
          <div className="flex gap-3 w-full max-w-sm mx-auto">
            <Button
              onClick={confirmCapture}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg h-14"
            >
              ✓ Usar foto
            </Button>
            <Button
              variant="outline"
              onClick={retake}
              className="border-white/30 text-white hover:bg-white/20 h-14"
            >
              🔄 Otra
            </Button>
          </div>
          <div className="mt-3">
            <Button variant="ghost" onClick={handleCancel} className="w-full text-white/60 hover:text-white hover:bg-white/10">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-20 left-4 right-4 mx-4 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 text-center" style={{ zIndex: 60 }}>
          {error}
        </div>
      )}
    </div>
  );
}
