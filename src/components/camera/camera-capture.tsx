'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
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
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [startCamera, previewUrl]);

  const switchCamera = useCallback(() => {
    setPreviewUrl(null);
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

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
    <div className="space-y-4">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/60 text-sm">Iniciando cámara...</div>
          </div>
        ) : previewUrl ? (
          <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
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
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        {previewUrl ? (
          <>
            <Button onClick={confirmCapture} className="flex-1">
              ✓ Usar foto
            </Button>
            <Button variant="outline" onClick={retake}>
              🔄 Otra
            </Button>
          </>
        ) : (
          <>
            <Button onClick={capturePhoto} className="flex-1" disabled={!!error || loading}>
              📷 Capturar
            </Button>
            <Button
              variant="outline"
              onClick={startCountdown}
              disabled={!!error || loading}
            >
              ⏱ 3s
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={switchCamera}
              disabled={!!error || loading}
              className="shrink-0"
            >
              🔄
            </Button>
          </>
        )}
      </div>

      <Button variant="ghost" onClick={handleCancel} className="w-full">
        Cancelar
      </Button>
    </div>
  );
}
