'use client';

import { useEffect, useState } from 'react';
import { isStandaloneDisplay } from '@/lib/pwa';

const INSTALLED_KEY = 'xalt:pwa-installed-previous';

function checkAndShow() {
  // Si ya está en modo standalone (app instalada y abierta), no mostrar nada
  if (isStandaloneDisplay()) return false;

  let wasInstalled = false;
  try {
    wasInstalled = localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    // Almacenamiento no disponible
  }
  return wasInstalled;
}

export default function InstalledAppBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificación inicial: si ya instaló antes y vuelve al navegador
    if (checkAndShow()) {
      setShowBanner(true);
    }

    // Escuchar el evento de instalación para mostrar el banner automáticamente
    const handleAppInstalled = () => {
      setTimeout(() => {
        if (checkAndShow()) {
          setShowBanner(true);
        }
      }, 500);
    };

    window.addEventListener('xalt:appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('xalt:appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('xalt:installed-banner-dismissed', '1');
    } catch {
      // Almacenamiento no disponible
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/20 pointer-events-auto">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-700 font-medium leading-snug">
              Para la mejor experiencia con la cámara, abre <strong>Xalt Moments</strong> desde el icono de tu dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar sugerencia"
          >
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
