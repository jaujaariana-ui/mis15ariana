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

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (maxRetries: number = 3, facingModeOverride?: 'user' | 'environment') => {
    setLoading(true);
    setError(null);

    const currentFacingMode = facingModeOverride || facingMode;

    // Stop any existing stream first
    stopCurrentStream();

    // Try to enumerate and stop all video tracks that might be held by this page
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      console.log('Video devices found:', videoDevices.length);
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }

    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s...
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Reintentando acceso a cámara (intento ${attempt + 1}/${maxRetries})...`);
        setError(`La cámara está ocupada. Reintentando en ${backoff / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        
        // Try to stop any lingering tracks before retry
        stopCurrentStream();
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: currentFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = mediaStream;
        
        // Wait for the video element to be ready and play
        // iOS Safari requires multiple attempts and a delay after setting srcObject
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Try to play with multiple retries for iOS compatibility
          let played = false;
          for (let playAttempt = 0; playAttempt < 5 && !played; playAttempt++) {
            if (playAttempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 200 * playAttempt));
            }
            try {
              await videoRef.current.play();
              played = true;
            } catch (playErr) {
              // Retry on play failure
              if (playAttempt === 4) {
                console.warn('Failed to play video after 5 attempts:', playErr);
              }
            }
          }
          
          // If still not playing, try loading then playing
          if (!played && videoRef.current) {
            try {
              await videoRef.current.load();
              await new Promise(resolve => setTimeout(resolve, 300));
              await videoRef.current!.play();
            } catch (e) {
              console.warn('Final play attempt failed:', e);
            }
          }
        }
        
        // Success! Break out of retry loop
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        
        // Check if this is a "camera in use" error worth retrying
        const isCameraInUse = err instanceof DOMException && err.name === 'NotReadableError';
        const isConcurrentModification = err instanceof DOMException && err.name === 'ConcurrentModificationError';
        
        if (!isCameraInUse && !isConcurrentModification) {
          // Other errors (permission denied, no camera) shouldn't be retried
          break;
        }
        
        console.warn(`Cámara ocupada (intento ${attempt + 1}/${maxRetries}):`, err);
        
        // Clean up the failed stream attempt
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    }

    // If all retries failed, show appropriate error message
    if (lastError) {
      const message =
        lastError instanceof DOMException && lastError.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.'
          : lastError instanceof DOMException && lastError.name === 'NotFoundError'
          ? 'No se encontró cámara en este dispositivo. Intenta seleccionar fotos desde la galería.'
          : lastError instanceof DOMException && lastError.name === 'NotReadableError'
          ? 'La cámara está siendo usada por otra aplicación. Por favor, cierra otras apps que usen la cámara (Zoom, Teams, WhatsApp, cámara del sistema) e intenta de nuevo.'
          : lastError instanceof DOMException && lastError.name === 'ConcurrentModificationError'
          ? 'La cámara está siendo usada por otra pestaña o aplicación. Cierra las otras pestañas que usen la cámara e intenta de nuevo.'
          : 'No se pudo acceder a la cámara. Intenta seleccionar fotos desde la galería.';
      setError(message);
    }

    setLoading(false);
  }, [facingMode, stopCurrentStream]);

  // Initialize camera when component mounts
  useEffect(() => {
    // Set initial orientation
    setOrientation(getOrientation());

    // Start camera immediately on mount
    startCamera();

    return () => {
      stopCurrentStream();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for orientation changes - allow device to rotate freely
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(getOrientation());
    };
    
    // Listen to screen orientation API
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }
    
    // Also listen to resize as fallback
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

  const switchCamera = useCallback(async () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);

    // Determine the new facing mode before starting the switch
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // Fully stop and clean up the current stream before switching
    // This is critical: we must wait for tracks to actually stop before requesting a new one
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error al detener track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Brief loading state to give visual feedback during switch
    setLoading(true);

    // Wait longer for the browser to fully release the previous camera hardware
    // before requesting the new one. On mobile devices, switching between front/back
    // cameras requires more time because the OS must release one physical camera
    // and acquire another. 1500ms is needed to avoid NotReadableError.
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Now start the new camera with the new facing mode directly
    startCamera(3, newFacingMode);
  }, [previewUrl, facingMode, startCamera]);

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onCapture(capturedBlob);
  }, [onCapture, capturedBlob, previewUrl]);

  const retake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    startCamera();
  }, [previewUrl, startCamera]);

  const handleCancel = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    onCancel();
  }, [onCancel, previewUrl]);

  const startCountdown = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null || countdown === 0) return;
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
      {/* Video/Preview area - fills entire screen, adapts to orientation */}
      <div className="absolute inset-0 bg-black">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/60 text-sm">Iniciando cámara...</div>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Vista previa"
            className={`w-full h-full object-contain ${
              orientation === 'landscape' ? '' : 'object-contain'
            }`}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onPlay={() => {
                // Video is playing successfully
              }}
              className={`absolute inset-0 w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
              style={{
                // Ensure video is visible on all mobile browsers, especially iOS Safari
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                objectPosition: 'center center',
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-8xl font-bold text-white/80 animate-pulse">
                  {countdown}
                </div>
              </div>
            )}
          </>
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
      {error && !loading && (
        <div className="absolute top-20 left-4 right-4 mx-4 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 text-center" style={{ zIndex: 60 }}>
          <p className="mb-2">{error}</p>
          <button
            onClick={() => startCamera(3)}
            className="bg-red-500/40 hover:bg-red-500/60 text-white text-sm px-4 py-2 rounded-md transition-colors"
            type="button"
          >
            🔄 Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
