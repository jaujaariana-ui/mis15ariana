'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';

type CameraErrorType = 
  | 'none'
  | 'not_allowed'
  | 'not_found'
  | 'not_readable'
  | 'overconstrained'
  | 'abort'
  | 'security'
  | 'not_supported'
  | 'unknown';

interface CameraError {
  type: CameraErrorType;
  message: string;
}

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
}

function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         navigator.mediaDevices != null && 
         typeof navigator.mediaDevices.getUserMedia === 'function';
}

// Detect if the app is running as an installed PWA
// In installed PWAs on Android, getUserMedia is unreliable or hangs indefinitely
function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for PWA-specific navigator properties
  if (typeof navigator !== 'undefined') {
    const nav = navigator as any;
    if (nav.standalone === true) return true; // iOS Safari
    if (nav.standalone !== undefined && nav.standalone) return true;
  }
  
  // Check for service worker registration (common in PWAs)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return true;
  }
  
  return false;
}

// Helper: add a timeout to any promise
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(resolve).catch(reject).finally(() => clearTimeout(timer));
  });
}

function classifyCameraError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return {
          type: 'not_allowed',
          message: 'Para tomar una fotografía, permite el acceso a la cámara desde la configuración de tu navegador.',
        };
      case 'NotFoundError':
        return {
          type: 'not_found',
          message: 'No encontramos una cámara disponible en este dispositivo. Puedes seleccionar una fotografía desde tu galería.',
        };
      case 'NotReadableError':
        return {
          type: 'not_readable',
          message: 'La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara e intenta de nuevo.',
        };
      case 'OverconstrainedError':
        return {
          type: 'overconstrained',
          message: 'La configuración de la cámara no es compatible con este dispositivo. Inténtalo nuevamente o selecciona una fotografía.',
        };
      case 'AbortError':
        return {
          type: 'abort',
          message: 'La inicialización de la cámara fue interrumpida. Inténtalo nuevamente.',
        };
      case 'SecurityError':
        return {
          type: 'security',
          message: 'No se puede acceder a la cámara por restricciones de seguridad. Asegúrate de usar HTTPS o localhost.',
        };
      default:
        return {
          type: 'unknown',
          message: 'Ocurrió un problema al activar tu cámara. Inténtalo nuevamente o selecciona una fotografía de tu dispositivo.',
        };
    }
  }

  return {
    type: 'unknown',
    message: 'Ocurrió un problema al activar tu cámara. Inténtalo nuevamente o selecciona una fotografía de tu dispositivo.',
  };
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [videoReady, setVideoReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop current camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera with the given facing mode
  const startCamera = useCallback(async (mode?: 'user' | 'environment') => {
    console.log('[Camera] startCamera llamado, isMounted:', isMountedRef.current);
    if (!isMountedRef.current) {
      console.log('[Camera] startCamera abortado: componente desmontado');
      return;
    }

    setLoading(true);
    setCameraError(null);
    setVideoReady(false);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const currentMode = mode || facingMode;

    // Stop any existing stream
    stopCamera();

    // Timeout de seguridad: si getUserMedia no responde en 8 segundos, mostrar error
    let getUserMediaTimedOut = false;
    const getUserMediaTimeout = setTimeout(() => {
      getUserMediaTimedOut = true;
      console.error('[Camera] TIMEOUT: getUserMedia no respondió en 8 segundos');
      if (isMountedRef.current) {
        setCameraError({
          type: 'unknown',
          message: 'La cámara no responde. Puedes seleccionar una fotografía desde tu galería como alternativa.',
        });
        setLoading(false);
      }
    }, 8000);

    try {
      console.log('[Camera] Solicitando acceso a la cámara con facingMode:', currentMode);
      console.log('[Camera] navigator.mediaDevices:', navigator.mediaDevices != null);
      console.log('[Camera] getUserMedia existe:', typeof navigator.mediaDevices?.getUserMedia === 'function');

      if (typeof window !== 'undefined') {
        console.log('[Camera] Protocolo:', window.location.protocol);
        console.log('[Camera] Host:', window.location.host);
      }

      if (!navigator.mediaDevices) {
        throw new Error('navigator.mediaDevices no está disponible en este navegador');
      }

      if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('getUserMedia no está disponible en este navegador');
      }

      console.log('[Camera] Llamando a getUserMedia...');
      // Use simpler constraints for better Android PWA compatibility
      // Avoid specifying width/height which can cause issues on some devices
      const stream = await withTimeout(
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: currentMode,
          },
          audio: false,
        }),
        8000,
        'getUserMedia no respondió en 8 segundos'
      );

      console.log('[Camera] ¡Stream obtenido exitosamente! Tracks:', stream.getTracks().length);

      // Clean up the timeout since we got a response
      clearTimeout(getUserMediaTimeout);

      if (getUserMediaTimedOut) {
        console.log('[Camera] Stream obtenido pero timeout ya había disparado, ignorando');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Verify stream has active video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No se obtuvo un track de video del stream');
      }

      // Verify the track is actually active and ready
      const track = videoTracks[0];
      if (!track.readyState || track.readyState === 'ended') {
        throw new Error('El track de video no está activo');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        // Force video to load and play - critical for PWA on Android
        video.load();

        // Try to play with error handling
        try {
          await video.play();
        } catch (playError) {
          console.error('Error al reproducir video:', playError);
          // If play fails, try again after a short delay
          await new Promise(resolve => setTimeout(resolve, 100));
          try {
            await video.play();
          } catch (secondError) {
            console.error('Segundo intento de reproducir video falló:', secondError);
            throw new Error('No se pudo reproducir el video de la cámara');
          }
        }

        // Additional check: ensure video dimensions are set
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.warn('Advertencia: dimensiones de video son 0, esperando...');
          // Wait for metadata to load
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout esperando metadata del video'));
            }, 3000);
            const onLoaded = () => {
              clearTimeout(timeout);
              video.removeEventListener('loadedmetadata', onLoaded);
              resolve();
            };
            video.addEventListener('loadedmetadata', onLoaded, { once: true });
          });
        }
      }

      // Set a timeout: if video doesn't become ready in 5 seconds, show error
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && !videoReady) {
          console.warn('Timeout: cámara no mostró video después de 5 segundos');
          setCameraError({
            type: 'unknown',
            message: 'La cámara no muestra imagen. Intenta de nuevo o selecciona una fotografía desde tu galería.',
          });
          setLoading(false);
        }
      }, 5000);

      if (isMountedRef.current) {
        setLoading(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error('[Camera] ERROR al acceder a la cámara:', err);
      console.error('[Camera] Tipo de error:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('[Camera] Nombre del error:', err instanceof DOMException ? err.name : 'N/A');
      console.error('[Camera] Mensaje del error:', err instanceof Error ? err.message : String(err));
      console.error('[Camera] Stack trace:', err instanceof Error ? err.stack : 'N/A');
      
      const classifiedError = classifyCameraError(err);
      setCameraError(classifiedError);
      setLoading(false);
    }
  }, [facingMode, stopCamera, videoReady]);

  // Initialize camera on mount
  useEffect(() => {
    console.log('[Camera] Componente montado, inicializando...');
    isMountedRef.current = true;
    setOrientation(getOrientation());

    // Warn if running as installed PWA but still try the camera
    if (isInstalledPWA()) {
      console.warn('[Camera] App instalada (PWA) detectada - intentando cámara de todos modos');
    }

    // Check if camera is supported
    if (!isCameraSupported()) {
      console.error('[Camera] Cámara NO soportada en este navegador');
      setCameraError({
        type: 'not_supported',
        message: 'Tu navegador no soporta el acceso a la cámara. Usa un navegador moderno o selecciona una fotografía desde tu galería.',
      });
      setLoading(false);
    } else {
      console.log('[Camera] Cámara soportada, llamando a startCamera()');
      startCamera();
    }

    // Handle visibility changes - critical for PWA on Android
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isMountedRef.current && !previewUrl) {
        // App came back to foreground - check if camera stream is still active
        const stream = streamRef.current;
        const videoTrack = stream?.getVideoTracks()[0];

        // If stream exists but track is stopped or muted, restart camera
        if (!videoTrack || !videoTrack.readyState || videoTrack.readyState === 'ended' || videoTrack.muted) {
          console.log('Cámara reiniciada al volver a la app');
          setCameraError(null);
          setVideoReady(false);
          await startCamera();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for orientation changes
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

  const switchCamera = useCallback(async () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    setVideoReady(false);

    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // Stop current stream before switching
    stopCamera();

    // Wait for the browser to release the previous camera hardware
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start the new camera
    startCamera(newFacingMode);
  }, [previewUrl, facingMode, startCamera, stopCamera]);

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
    setVideoReady(false);
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

  // Render error state based on error type
  const renderErrorState = () => {
    if (!cameraError) return null;

    const { type, message } = cameraError;

    // Error icon based on type
    const getErrorIcon = () => {
      switch (type) {
        case 'not_allowed':
          return '🔒';
        case 'not_found':
          return '📷';
        case 'not_readable':
          return '⚠️';
        case 'overconstrained':
          return '⚙️';
        case 'abort':
          return '⏸️';
        case 'security':
          return '🔐';
        case 'not_supported':
          return '🌐';
        default:
          return '❌';
      }
    };

    // Error title based on type
    const getErrorTitle = () => {
      switch (type) {
        case 'not_allowed':
          return 'Necesitamos acceso a tu cámara';
        case 'not_found':
          return 'Cámara no disponible';
        case 'not_readable':
          return 'Cámara ocupada';
        case 'overconstrained':
          return 'Configuración no compatible';
        case 'abort':
          return 'Inicialización interrumpida';
        case 'security':
          return 'Restricción de seguridad';
        case 'not_supported':
          return 'Navegador no compatible';
        default:
          return 'No pudimos iniciar la cámara';
      }
    };

    // Show technical details for debugging
    const getDebugInfo = () => {
      if (type !== 'unknown') return null;
      return (
        <div className="mt-4 p-3 bg-black/30 rounded-lg">
          <p className="text-white/50 text-xs font-mono break-all">
            {message}
          </p>
        </div>
      );
    };

    // Buttons based on error type
    const renderButtons = () => {
      switch (type) {
        case 'not_allowed':
          return (
            <button
              onClick={handleCancel}
              className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-xl transition-colors w-full"
              type="button"
            >
              Entendido
            </button>
          );
        case 'not_found':
          return (
            <button
              onClick={handleCancel}
              className="bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 rounded-xl transition-colors w-full"
              type="button"
            >
              Elegir fotografía
            </button>
          );
        case 'not_supported':
          return (
            <button
              onClick={handleCancel}
              className="bg-white/30 hover:bg-white/40 active:bg-white/50 text-white font-semibold text-base px-6 py-4 rounded-xl transition-colors w-full shadow-lg"
              type="button"
            >
              📷 Elegir fotografía desde la galería
            </button>
          );
        default:
          return (
            <>
              <button
                onClick={handleCancel}
                className="bg-white/30 hover:bg-white/40 active:bg-white/50 text-white font-semibold text-base px-6 py-4 rounded-xl transition-colors mb-3 w-full shadow-lg"
                type="button"
              >
                📷 Elegir fotografía desde la galería
              </button>
              <button
                onClick={() => startCamera()}
                className="bg-white/10 hover:bg-white/20 text-white/70 font-medium px-6 py-3 rounded-xl transition-colors w-full"
                type="button"
              >
                🔄 Reintentar cámara
              </button>
            </>
          );
      }
    };

    return (
      <div className="absolute inset-0 flex items-center justify-center px-6 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">{getErrorIcon()}</div>
          <h3 className="text-white text-xl font-semibold mb-3">{getErrorTitle()}</h3>
          <p className="text-white/70 text-sm mb-6 leading-relaxed">{message}</p>
          {getDebugInfo()}
          {renderButtons()}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col h-screen w-screen bg-black overflow-hidden" style={{ touchAction: 'auto' }}>
      {/* Video/Preview area - fills entire screen, adapts to orientation */}
      <div className="absolute inset-0 bg-black">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
            <div className="text-center px-6">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-white text-base font-medium mb-2">Preparando cámara...</div>
              <div className="text-white/60 text-sm mb-6">Si la cámara no funciona, usa la galería</div>
              <button
                onClick={handleCancel}
                className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-medium px-6 py-3 rounded-xl transition-colors w-full"
                type="button"
              >
                📷 Usar galería de fotos
              </button>
            </div>
          </div>
        ) : cameraError ? (
          renderErrorState()
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
              onCanPlay={() => {
                console.log('Video canplay - stream activo');
              }}
              onPlaying={() => {
                console.log('Video playing - mostrando frames');
                setVideoReady(true);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
              }}
              onWaiting={() => {
                console.log('Video waiting - buffering');
              }}
              onError={(e) => {
                console.error('Video error:', e);
                if (isMountedRef.current && !cameraError) {
                  setCameraError({
                    type: 'unknown',
                    message: 'El video de la cámara no puede reproducirse. Intenta de nuevo o selecciona una fotografía.',
                  });
                  setLoading(false);
                }
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
      {!previewUrl && !cameraError && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 55 }}>
          {/* Cancel button - ALWAYS visible, even during loading */}
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

          {/* Side controls - right side, vertically stacked like native camera */}
          {!loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 pointer-events-auto" style={{ zIndex: 60 }}>
              {/* Switch camera button */}
              <button
                onClick={switchCamera}
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
    </div>
  );
}
