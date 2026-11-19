'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
}

export default function ConsentModal({ open, onAccept }: ConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md border-0 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="text-center mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
              <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <DialogTitle className="text-center font-playfair text-xl text-slate-800">
              Aviso de privacidad
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
          Las fotos que compartas serán visibles para todos los invitados de este evento.
          Podrás eliminar tus fotos en cualquier momento.
        </p>
        <button
          className="premium-btn w-full py-3 text-sm"
          onClick={onAccept}
        >
          Entendido, continuar
        </button>
      </DialogContent>
    </Dialog>
  );
}
