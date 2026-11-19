'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [countdown, setCountdown] = useState<number | null>(null);
  const initializedRef = useRef(false);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Stop any existing stream first
    stopCurrentStream();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      
      // Wait for the video element to be ready and play
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Use promise-based play with error handling
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // If play fails, try again after a short delay (iOS workaround)
          await new Promise(resolve => setTimeout(resolve, 100));
          if (videoRef.current) {
            await videoRef.current.play();
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'No se encontró cámara en este dispositivo. Intenta seleccionar fotos desde la galería.'
          : err instanceof DOMException && err.name === 'NotReadableError'
          ? 'La cámara está siendo usada por otra aplicación. Cierra la otra app e intenta de nuevo.'
          : 'No se pudo acceder a la cámara. Intenta seleccionar fotos desde la galería.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [facingMode, stopCurrentStream]);

  // Initialize camera only once when component mounts
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    startCamera();
    
    return () => {
      stopCurrentStream();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const switchCamera = useCallback(() => {
    setPreviewUrl(null);
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Restart camera when facing mode changes
  useEffect(() => {
    startCamera();
  }, [facingMode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      },
      'image/jpeg',
      0.9
    );
  }, []);

  const confirmCapture = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          onCapture(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [onCapture, previewUrl]);

  const retake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    startCamera();
  }, [previewUrl, startCamera]);

  const handleCancel = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
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
    <div className="flex flex-col h-full w-full bg-black">
      {/* Video/Preview area - takes up all available space */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/60 text-sm">Iniciando cámara...</div>
          </div>
        ) : previewUrl ? (
          <img src={previewUrl} alt="Vista previa" className="w-full h-full object-contain" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
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

        {/* Cancel button at top */}
        {!loading && !previewUrl && (
          <button
            onClick={handleCancel}
            className="absolute top-4 left-4 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Switch camera button at top right */}
        {!loading && !previewUrl && (
          <button
            onClick={switchCamera}
            disabled={!!error || loading}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 text-center">
          {error}
        </div>
      )}

      {/* Controls at bottom */}
      <div className="pb-8 pt-6 px-4 flex items-center justify-center gap-6">
        {previewUrl ? (
          <div className="flex gap-3 w-full max-w-sm">
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
        ) : (
          <>
            {/* Capture button - large circle */}
            <button
              onClick={capturePhoto}
              disabled={!!error || loading}
              className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg border-4 border-white/30"
            >
              <div className="w-16 h-16 rounded-full border-2 border-gray-400" />
            </button>

            {/* Timer button */}
            <button
              onClick={startCountdown}
              disabled={!!error || loading}
              className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              title="Temporizador 3s"
            >
              ⏱
            </button>
          </>
        )}
      </div>

      {/* Cancel button at very bottom for preview mode */}
      {previewUrl && (
        <div className="pb-4 px-4">
          <Button variant="ghost" onClick={handleCancel} className="w-full text-white/60 hover:text-white hover:bg-white/10">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
