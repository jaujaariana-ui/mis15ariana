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
    /* eslint-disable react-hooks/set-state-in-effect -- Sincroniza el estado con APIs exclusivas del navegador (navigator/localStorage); leerlas en el render provocaría un desajuste de hidratación. */
    setIsInstalled(isStandaloneDisplay());
    setIsIOS(isIOSDevice());

    try {
      setIsDismissed(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1');
    } catch {
      setIsDismissed(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleBeforeInstallPrompt = (event: Event) => {
      // Evita el mini-infobar del navegador para usar nuestra propia ventana.
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };

    const handleAppInstalled = () => {
      // Tras instalar, el evento deja de ser reutilizable.
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setIsInstalled(true);
      try {
        localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
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
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQueries.forEach((mq) => mq.addEventListener('change', handleDisplayModeChange));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      setCanPrompt(false);
      return outcome;
    } catch (err) {
      console.warn('No se pudo iniciar la instalación de la PWA:', err);
      deferredPromptRef.current = null;
      setCanPrompt(false);
      return 'unavailable';
    }
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
    } catch {
      // almacenamiento no disponible
    }
  }, []);

  return { isInstalled, isIOS, canPrompt, isDismissed, promptInstall, dismiss };
}
