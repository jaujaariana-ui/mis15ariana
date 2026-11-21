import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/utils/date-formatter';
import PhotoManager from '@/components/admin/photo-manager';
import GuestManager from '@/components/admin/guest-manager';
import DrawManager from '@/components/admin/draw-manager';
import QRGenerator from '@/components/events/qr-generator';
import { DeleteEventDialog } from '@/components/admin/delete-event-dialog';
import CoverImageManager from '@/components/admin/cover-image-manager';

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
  expired: 'Expirado',
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default';
    case 'draft': return 'secondary';
    case 'closed': return 'secondary';
    case 'expired': return 'secondary';
    default: return 'secondary';
  }
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEventDetail({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const adminClient = createAdminClient();
  const { data: organizer } = await adminClient
    .from('organizers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  const { data: event } = organizer
    ? await adminClient
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('organizer_id', organizer.id)
        .single()
    : { data: null };

  if (!event) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">Evento no encontrado</p>
            <Link href="/admin">
              <Button>Volver al dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { count: photoCount } = await adminClient
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .is('deleted_at', null);

  const { count: guestCount } = await adminClient
    .from('guest_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id);

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="outline">← Volver</Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <Badge variant={statusBadgeVariant(event.status)}>
              {statusLabel[event.status] || event.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Creado {formatRelativeTime(event.created_at)}
            {event.event_date && ` · Fecha del evento: ${event.event_date}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">📷 {photoCount || 0} fotos</span>
          <span className="text-sm text-gray-500">👤 {guestCount || 0} invitados</span>
          <DeleteEventDialog eventId={event.id} eventName={event.name} />
        </div>
      </div>

      {event.description && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-gray-700">{event.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CoverImageManager eventId={event.id} initialCoverImage={event.cover_image} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <QRGenerator
            eventId={event.id}
            eventSlug={event.slug}
            eventName={event.name}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-500">Enlace del evento</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`/e/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline break-all"
              >
                /e/{event.slug}
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-500">Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant={statusBadgeVariant(event.status)}>
                  {statusLabel[event.status] || event.status}
                </Badge>
                <div className="text-xs text-gray-500">
                  <p>Límite de fotos: {event.max_photos ?? 'Ilimitado'}</p>
                  <p>Tamaño máximo: {event.max_file_size_mb ?? 10} MB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        <DrawManager eventId={event.id} />
        <PhotoManager eventId={event.id} />
        <GuestManager eventId={event.id} />
      </div>
    </div>
  );
}
