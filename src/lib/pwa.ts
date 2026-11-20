// Utilidades compartidas de PWA: detección de modo instalado y conservación de enlaces.

// Marca que la ventana de instalación fue cerrada por el invitado.
export const PWA_INSTALL_DISMISSED_KEY = 'xalt:pwa-install-dismissed';
// Ruta del evento que debe restaurarse al abrir la aplicación instalada.
export const PENDING_EVENT_PATH_KEY = 'xalt:pending-event-path';

// Una pestaña normal del navegador NO debe considerarse una app instalada.
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;

  const standalone =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches
      : false;

  // Safari en iOS expone navigator.standalone en lugar de display-mode.
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return standalone || iosStandalone;
}

// iOS/iPadOS: Safari no emite beforeinstallprompt, requiere instrucciones manuales.
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ se identifica como Mac, se detecta por los puntos táctiles.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
}
