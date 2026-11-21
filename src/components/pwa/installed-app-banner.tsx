'use client';

import { useEffect, useState } from 'react';
import { isStandaloneDisplay, isIOSDevice } from '@/lib/pwa';

const INSTALLED_KEY = 'xalt:pwa-installed-previous';
const DISMISSED_KEY = 'xalt:installed-banner-dismissed';

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
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Solo en el cliente
    setIsIOS(isIOSDevice());

    // Verificación inicial: si ya instaló antes y vuelve al navegador
    if (checkAndShow()) {
      setShowBanner(true);
    }

    // Escuchar el evento de instalación para mostrar el banner automáticamente
    // sin necesidad de refresh
    const handleAppInstalled = () => {
      // Pequeño delay para que el navegador complete la transición
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
    // Permitir cerrar el banner una vez por sesión
    try {
      sessionStorage.setItem('xalt:installed-banner-dismissed', '1');
    } catch {
      // Almacenamiento no disponible
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 px-6 py-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white font-playfair mb-2">
            Usa Xalt Moments instalada
          </h2>
          <p className="text-sm text-white/80">
            Detectamos que ya instalaste la aplicación
          </p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-4 text-center">
            Para disfrutar de la <strong>mejor experiencia con la cámara</strong> y subir fotos sin
            limitaciones, abre Xalt Moments desde el icono de tu dispositivo.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-1">
                  ¿Por qué usar la app instalada?
                </p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Acceso completo a la cámara sin restricciones del navegador</li>
                  <li>• Fotos de mayor calidad y más rápidas</li>
                  <li>• Sin barras del navegador que obstruyen la vista</li>
                </ul>
              </div>
            </div>
          </div>

          {isIOS ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">
                Cómo abrir la app instalada en iPhone/iPad:
              </p>
              <ol className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <span className="text-xs text-slate-600">
                    Cierra esta pestaña de Safari
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <span className="text-xs text-slate-600">
                    Ve a la pantalla de inicio de tu dispositivo
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center mt-0.5">
                    3
                  </span>
                  <span className="text-xs text-slate-600">
                    Toca el icono de <strong>Xalt Moments</strong> para abrir la app
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">
                Cómo abrir la app instalada:
              </p>
              <ol className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <span className="text-xs text-slate-600">
                    Cierra esta pestaña del navegador
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <span className="text-xs text-slate-600">
                    Busca el icono de <strong>Xalt Moments</strong> en tu pantalla de inicio o menú de apps
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center mt-0.5">
                    3
                  </span>
                  <span className="text-xs text-slate-600">
                    Abre la app para continuar
                  </span>
                </li>
              </ol>
            </div>
          )}

          <button
            type="button"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
            onClick={handleDismiss}
          >
            Entendido, continuaré desde la app
          </button>

          <p className="text-[10px] text-slate-400 text-center mt-3">
            La cámara funciona mejor en la app instalada
          </p>
        </div>
      </div>
    </div>
  );
}
