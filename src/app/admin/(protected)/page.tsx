import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/utils/date-formatter';
import { EventSlugLink } from '@/components/events/event-slug-link';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const adminClient = createAdminClient();

  // Get organizer info
  const { data: organizer } = await adminClient
    .from('organizers')
    .select('id, email')
    .eq('auth_user_id', user.id)
    .single();

  let events = [];
  let totalPhotos = 0;
  let totalGuests = 0;
  let totalStorageBytes = 0;
  let recentPhotos = [];

  if (organizer) {
    const { data: eventsData } = await adminClient
      .from('events')
      .select('*')
      .eq('organizer_id', organizer.id)
      .order('created_at', { ascending: false });
    events = eventsData || [];

    // Aggregate stats across all events with per-event counts
    const eventStats = await Promise.all(events.map(async (event) => {
      const { count: photoCount } = await adminClient
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .is('deleted_at', null);

      const { data: photosWithSize } = await adminClient
        .from('photos')
        .select('file_size')
        .eq('event_id', event.id)
        .is('deleted_at', null);
      const storageBytes = photosWithSize?.reduce((sum, p) => sum + (p.file_size || 0), 0) || 0;

      const { count: guestCount } = await adminClient
        .from('guest_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);

      return {
        eventId: event.id,
        photoCount: photoCount || 0,
        guestCount: guestCount || 0,
        storageBytes,
      };
    }));

    for (const stat of eventStats) {
      totalPhotos += stat.photoCount;
      totalGuests += stat.guestCount;
      totalStorageBytes += stat.storageBytes;
    }

    // Get recent photos across all events
    const eventIds = events.map(e => e.id);
    if (eventIds.length > 0) {
      const { data: recentData } = await adminClient
        .from('photos')
        .select(`
          *,
          guest_profiles!photos_guest_id_fkey(display_name),
          events(name)
        `)
        .in('event_id', eventIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      recentPhotos = recentData || [];
    }
  }

  // Make eventStats available to the JSX scope
  const eventStatsMap = events.length > 0 ? await Promise.all(events.map(async (event) => {
    const { count: photoCount } = await adminClient
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .is('deleted_at', null);
    const { count: guestCount } = await adminClient
      .from('guest_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id);
    return { eventId: event.id, photoCount: photoCount || 0, guestCount: guestCount || 0 };
  })) : [];
  const getEventStats = (id: string) => eventStatsMap.find((s: any) => s.eventId === id);

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {organizer?.email && (
            <p className="text-sm text-gray-500 mt-1">{organizer.email}</p>
          )}
        </div>
        <Link href="/admin/events/create">
          <Button>+ Nuevo evento</Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{events.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {events.filter(e => e.status === 'active').length} activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Fotos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalPhotos}</p>
            <p className="text-xs text-gray-500 mt-1">En todos los eventos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Invitados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalGuests}</p>
            <p className="text-xs text-gray-500 mt-1">Participantes totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Almacenamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{formatStorage(totalStorageBytes)}</p>
            <p className="text-xs text-gray-500 mt-1">Espacio utilizado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events list */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tus eventos</h2>
          {events.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aún no tienes eventos</p>
                <Link href="/admin/events/create">
                  <Button>Crear primer evento</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
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
                            <EventSlugLink href={`/e/${event.slug}`} className="hover:underline">
                              /e/{event.slug}
                            </EventSlugLink>
                          </p>
                          {(() => {
                            const stat = getEventStats(event.id);
                            return (
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>📷 {stat?.photoCount || 0} fotos</span>
                                <span>👤 {stat?.guestCount || 0} invitados</span>
                                {event.event_date && <span>📅 {event.event_date}</span>}
                              </div>
                            );
                          })()}
                        </div>
                        <span className="text-gray-400 text-sm">→</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent photos sidebar */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fotos recientes</h2>
          {recentPhotos.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 text-sm">Sin fotos aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentPhotos.map((photo: any) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={`/api/photos/${photo.id}/download`}
                      alt={`Foto por ${photo.guest_profiles?.display_name || 'Anónimo'}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500">
                      {photo.events?.name || 'Evento'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {photo.guest_profiles?.display_name || 'Anónimo'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(photo.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
