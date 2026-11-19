import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventById, updateEvent, deleteEvent } from '@/services/event.service';
import { updateEventSchema } from '@/lib/validations/event-schemas';
import { verifyEventAccess } from '@/lib/security/idor-protection';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const hasAccess = await verifyEventAccess(adminClient, id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    const event = await getEventById(adminClient, id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json({ error: 'Error al obtener evento' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const hasAccess = await verifyEventAccess(adminClient, id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateEventSchema.parse(body);

    const event = await updateEvent(adminClient, id, validated);
    return NextResponse.json({ event });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({ error: 'Error al actualizar evento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('DELETE event: Auth failed - user not found');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log(`DELETE event: User ${user.id} trying to delete event ${id}`);

    const adminClient = createAdminClient();

    const hasAccess = await verifyEventAccess(adminClient, id, user.id);
    if (!hasAccess) {
      console.log(`DELETE event: User ${user.id} does not have access to event ${id}`);
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    // Verify event exists
    const event = await getEventById(adminClient, id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const result = await deleteEvent(adminClient, id);
    return NextResponse.json({ success: true, photosDeleted: result.photosDeleted });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Error al eliminar evento' }, { status: 500 });
  }
}
