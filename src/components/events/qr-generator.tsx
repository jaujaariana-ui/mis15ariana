'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface QRGeneratorProps {
  eventId: string;
  eventSlug: string;
  eventName: string;
}

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
  expired: 'Expirado',
};

export default function QRGenerator({ eventId, eventSlug, eventName }: QRGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);

  // Detect the current URL from the browser, falling back to env var or localhost
  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const eventUrl = `${appUrl}/e/${eventSlug}`;

  // Generate QR code client-side to avoid auth issues with server endpoint
  useEffect(() => {
    let cancelled = false;
    setQrLoading(true);
    setQrError(null);

    import('qrcode').then((QRCode) => {
      return QRCode.toDataURL(eventUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }).then((dataUrl) => {
      if (!cancelled) {
        setQrDataUrl(dataUrl);
        setQrLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        console.error('QR generation error:', err);
        setQrError('Error al generar el código QR');
        setQrLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [eventUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = useCallback(() => {
    if (!qrDataUrl) return;

    // Convert data URL to blob for download
    fetch(qrDataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${eventSlug}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error('Download error:', err);
        setQrError('Error al descargar el QR');
      });
  }, [qrDataUrl, eventSlug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compartir evento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-center">
            {qrLoading ? (
              <div className="w-[300px] h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-gray-400">Generando QR...</div>
              </div>
            ) : qrError ? (
              <div className="w-[300px] h-[300px] flex items-center justify-center bg-red-50 rounded-lg text-red-500">
                {qrError}
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code para ${eventName}`} className="w-[300px] h-[300px] rounded-lg" />
            ) : null}
          </div>
          <div>
            <label className="text-sm text-gray-500">Enlace del evento</label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={eventUrl} className="flex-1 bg-gray-50" />
              <Button variant="outline" onClick={handleCopy}>
                {copied ? '✓ Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadQR} disabled={!qrDataUrl}>
              📱 Descargar QR (PNG)
            </Button>
            <a href={eventUrl} target="_blank" rel="noopener noreferrer">
              <Button>Abrir evento →</Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
