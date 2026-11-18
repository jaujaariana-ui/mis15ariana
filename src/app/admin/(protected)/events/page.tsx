import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventSlugLink } from '@/components/events/event-slug-link';

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

export default async function AdminEvents() {
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

  const { data: events } = organizer
    ? await adminClient
        .from('events')
        .select('*')
        .eq('organizer_id', organizer.id)
        .order('created_at', { ascending: false })
    : { data: null };

  // Get stats for each event
  const eventStats = events ? await Promise.all(events.map(async (event) => {
    const { count: photoCount } = await adminClient
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .is('deleted_at', null);

    const { count: guestCount } = await adminClient
      .from('guest_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id);

    return {
      eventId: event.id,
      photoCount: photoCount || 0,
      guestCount: guestCount || 0,
    };
  })) : [];

  const getStats = (eventId: string) => eventStats.find(s => s.eventId === eventId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500 mt-1">{events?.length || 0} eventos creados</p>
        </div>
        <Link href="/admin/events/create">
          <Button>+ Nuevo evento</Button>
        </Link>
      </div>

      {(!events || events.length === 0) ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">No tienes eventos aún</p>
            <Link href="/admin/events/create">
              <Button>Crear primer evento</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const stats = getStats(event.id);
            return (
              <Link key={event.id} href={`/admin/events/${event.id}`}>
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
                          <span>📷 {stats?.photoCount || 0} fotos</span>
                          <span>👤 {stats?.guestCount || 0} invitados</span>
                          {event.event_date && <span>📅 {event.event_date}</span>}
                          <span>Creado {new Date(event.created_at).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                      <span className="text-gray-400 text-lg">→</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
