'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { usePwaInstall } from '@/hooks/use-pwa-install';

interface StepProps {
  number: number;
  title: string;
  description: string;
}

function IOSStep({ number, title, description }: StepProps) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-semibold flex items-center justify-center">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-700 font-medium leading-tight">{title}</p>
        <p className="text-xs text-slate-400 leading-snug mt-0.5">{description}</p>
      </div>
    </li>
  );
}

export default function InstallPrompt() {
  const { isInstalled, isIOS, canPrompt, isDismissed, promptInstall, dismiss } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  // Nunca ofrecer instalación si ya está instalada, si se descartó o si el
  // navegador no ofrece una vía real (Chromium: prompt; iOS: instrucciones).
  const open = !isInstalled && !isDismissed && (canPrompt || isIOS);

  const handleClose = () => {
    dismiss();
  };

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    // El prompt nativo solo puede usarse una vez: se cierra en cualquier caso.
    if (outcome === 'accepted' || outcome === 'dismissed' || outcome === 'unavailable') {
      dismiss();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent className="max-w-md rounded-3xl border-0 bg-white/95 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center text-center px-1 pt-2 pb-1">
          {/* Icono de Xalt Moments */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-5">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase mb-1">
            Xalt Moments
          </p>
          <DialogTitle className="font-playfair text-2xl text-slate-800 font-semibold mb-2">
            Lleva tus recuerdos contigo
          </DialogTitle>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Instala Xalt Moments para disfrutar de las fotografías y recuerdos de este
            evento desde tu dispositivo.
          </p>

          {canPrompt ? (
            /* Android / Chrome / Edge: instalación nativa real */
            <button
              type="button"
              className="premium-btn w-full py-3 text-sm disabled:opacity-60"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? 'Iniciando instalación...' : 'Instalar aplicación'}
            </button>
          ) : (
            /* iOS/iPadOS: Safari no permite instalación programática */
            <div className="w-full text-left bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Cómo instalar en iPhone o iPad
              </p>
              <ol className="space-y-3">
                <IOSStep
                  number={1}
                  title="Toca el botón Compartir"
                  description="El icono con la flecha hacia arriba en la barra de Safari."
                />
                <IOSStep
                  number={2}
                  title='Elige "Agregar a pantalla de inicio"'
                  description="Desplázate por el menú hasta encontrar esta opción."
                />
                <IOSStep
                  number={3}
                  title="Confirma la instalación"
                  description='Toca "Agregar" en la esquina superior derecha.'
                />
                <IOSStep
                  number={4}
                  title="Abre Xalt Moments desde el icono"
                  description="Y regresarás directamente a este evento."
                />
              </ol>
              <p className="text-[11px] text-slate-400 mt-3 flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 mt-px shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Usa Safari para instalar la aplicación en tu dispositivo.</span>
              </p>
            </div>
          )}

          <button
            type="button"
            className="premium-btn-secondary w-full py-3 text-sm mt-3"
            onClick={handleClose}
          >
            Continuar en el navegador
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
