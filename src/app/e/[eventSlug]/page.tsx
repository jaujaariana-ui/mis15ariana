import { createAdminClient } from '@/lib/supabase/admin';
import { getEventBySlug } from '@/services/event.service';
import EventPageClient from '@/components/events/event-page-client';

interface Props {
  params: Promise<{ eventSlug: string }>;
}

export default async function EventPage({ params }: Props) {
  const { eventSlug } = await params;
  const supabase = createAdminClient();

  const event = await getEventBySlug(supabase, eventSlug);

  if (!event || event.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Evento no encontrado
          </h1>
          <p className="text-gray-600">
            Este evento no existe o está inactivo.
          </p>
        </div>
      </div>
    );
  }

  return <EventPageClient event={event} />;
}
