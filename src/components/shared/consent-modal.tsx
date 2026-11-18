'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
}

export default function ConsentModal({ open, onAccept }: ConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="text-center mb-2">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📸</span>
            </div>
            <DialogTitle className="text-center">
              Aviso de privacidad
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-gray-600 text-center mb-4">
          Las fotos que subas serán visibles para todos los participantes de este evento.
          Podrás eliminar tus fotos en cualquier momento.
        </p>
        <Button className="w-full" onClick={onAccept}>
          Entendido, continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
