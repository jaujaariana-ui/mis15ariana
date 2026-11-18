'use client';

import { useState } from 'react';
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const eventUrl = `${appUrl}/e/${eventSlug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compartir evento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
            <a href={`/api/events/${eventId}/qr?format=png`} download={`qr-${eventSlug}.png`}>
              <Button variant="outline">📱 Descargar QR (PNG)</Button>
            </a>
            <a href={eventUrl} target="_blank" rel="noopener noreferrer">
              <Button>Abrir evento →</Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
