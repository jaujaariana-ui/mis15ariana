"use client";

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EventSlugLink } from '@/components/events/event-slug-link';
import { DeleteEventDialog } from '@/components/admin/delete-event-dialog';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    slug: string;
    status: string;
    event_date?: string | null;
    created_at: string;
  };
  photoCount: number;
  guestCount: number;
}

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
  expired: 'Expirado',
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default';
    default: return 'secondary';
  }
};

export function EventCard({ event, photoCount, guestCount }: EventCardProps) {
  return (
    <div className="group">
      <Link href={`/admin/events/${event.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{event.name}</h3>
                  <Badge variant={statusBadgeVariant(event.status)}>
                    {statusLabel[event.status] || event.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  <EventSlugLink
                    href={`/e/${event.slug}`}
                    className="hover:underline"
                  >
                    /e/{event.slug}
                  </EventSlugLink>
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>📷 {photoCount} fotos</span>
                  <span>👤 {guestCount} invitados</span>
                  {event.event_date && <span>📅 {event.event_date}</span>}
                  <span>Creado {new Date(event.created_at).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DeleteEventDialog eventId={event.id} eventName={event.name} />
                <span className="text-gray-400 text-lg">→</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
