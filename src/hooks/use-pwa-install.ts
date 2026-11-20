'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PWA_INSTALL_DISMISSED_KEY,
  isIOSDevice,
  isStandaloneDisplay,
} from '@/lib/pwa';

// Evento no estándar (solo Chromium) que no existe en los tipos de lib.dom.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    /** Evento capturado por el script temprano del layout (ver src/app/layout.tsx). */
    __xaltInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

interface UsePwaInstallResult {
  /** La app se está ejecutando como aplicación instalada (no una pestaña). */
  isInstalled: boolean;
  /** Dispositivo iOS/iPadOS (requiere instrucciones manuales). */
  isIOS: boolean;
  /** Existe un beforeinstallprompt válido para lanzar la instalación nativa. */
  canPrompt: boolean;
  /** El invitado ya cerró la ventana de instalación. */
  isDismissed: boolean;
  /** Lanza el prompt nativo y devuelve la elección del usuario. */
  promptInstall: () => Promise<InstallOutcome>;
  /** Marca la ventana como descartada para no volver a mostrarla. */
  dismiss: () => void;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  // Se inicializa en true para no mostrar la ventana antes de leer el almacenamiento.
  const [isDismissed, setIsDismissed] = useState(true);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Sincroniza el estado con APIs exclusivas del navegador (navigator/sessionStorage); leerlas en el render provocaría un desajuste de hidratación. */
    setIsInstalled(isStandaloneDisplay());
    setIsIOS(isIOSDevice());

    try {
      setIsDismissed(sessionStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1');
    } catch {
      setIsDismissed(false);
    }

    // Recupera un `beforeinstallprompt` capturado por el script temprano del layout
    // antes de que este componente montara (evita perder el evento por una carrera).
    const adoptCapturedPrompt = () => {
      const captured = window.__xaltInstallPrompt;
      if (captured) {
        deferredPromptRef.current = captured;
        setCanPrompt(true);
      }
    };
    adoptCapturedPrompt();
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleBeforeInstallPrompt = (event: Event) => {
      // Evita el mini-infobar del navegador para usar nuestra propia ventana.
      event.preventDefault();
      const deferred = event as BeforeInstallPromptEvent;
      deferredPromptRef.current = deferred;
      // Se conserva también en window por consistencia con la captura temprana.
      window.__xaltInstallPrompt = deferred;
      setCanPrompt(true);
    };

    const handleAppInstalled = () => {
      // Tras instalar, el evento deja de ser reutilizable.
      deferredPromptRef.current = null;
      window.__xaltInstallPrompt = null;
      setCanPrompt(false);
      setIsInstalled(true);
      try {
        sessionStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
      } catch {
        // almacenamiento no disponible
      }
    };

    // Cambios de modo de visualización (p. ej. al abrir desde el icono instalado).
    const mediaQueries =
      typeof window.matchMedia === 'function'
        ? [
            window.matchMedia('(display-mode: standalone)'),
            window.matchMedia('(display-mode: fullscreen)'),
          ]
        : [];
    const handleDisplayModeChange = () => setIsInstalled(isStandaloneDisplay());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('xalt:installprompt', adoptCapturedPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQueries.forEach((mq) => mq.addEventListener('change', handleDisplayModeChange));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('xalt:installprompt', adoptCapturedPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQueries.forEach((mq) => mq.removeEventListener('change', handleDisplayModeChange));
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const deferred = deferredPromptRef.current;
    if (!deferred) return 'unavailable';

    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // Un beforeinstallprompt solo puede usarse una vez.
      deferredPromptRef.current = null;
      window.__xaltInstallPrompt = null;
      setCanPrompt(false);
      return outcome;
    } catch (err) {
      console.warn('No se pudo iniciar la instalación de la PWA:', err);
      deferredPromptRef.current = null;
      window.__xaltInstallPrompt = null;
      setCanPrompt(false);
      return 'unavailable';
    }
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      // Por sesión: el invitado vuelve a ver la oferta al reingresar en una nueva
      // sesión, en lugar de ocultarla para siempre.
      sessionStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
    } catch {
      // almacenamiento no disponible
    }
  }, []);

  return { isInstalled, isIOS, canPrompt, isDismissed, promptInstall, dismiss };
}
