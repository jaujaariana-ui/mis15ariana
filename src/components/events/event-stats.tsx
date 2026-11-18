'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EventStatsProps {
  photoCount: number;
  guestCount: number;
}

export default function EventStats({ photoCount, guestCount }: EventStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{photoCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Invitados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{guestCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
