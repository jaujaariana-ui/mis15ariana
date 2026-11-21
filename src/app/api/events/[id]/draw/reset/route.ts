import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { clearDrawWinners } from '@/services/draw.service';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/events/[id]/draw/reset
 * Resetear completamente el sorteo: limpiar ganadores, sesiones activas y estado.
 * Solo el organizador autorizado puede hacerlo.
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id: eventId } = await params;

    // Verificar autenticación del organizador
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verificar que el usuario es el organizador del evento
    const { data: organizer } = await adminClient
      .from('organizers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data: event } = await adminClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('organizer_id', organizer.id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'No tienes permiso para este evento' }, { status: 403 });
    }

    // Cancelar sesiones activas (pending/running)
    await adminClient
      .from('draw_sessions')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .in('status', ['pending', 'running']);

    // Eliminar todo el historial de ganadores
    await clearDrawWinners(adminClient, eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al resetear sorteo:', error);
    return NextResponse.json(
      { error: 'Error al resetear el sorteo' },
      { status: 500 }
    );
  }
}
