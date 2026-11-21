import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDrawWinners, clearDrawWinners } from '@/services/draw.service';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/draw/winners
 * Obtener la lista de ganadores de un evento.
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: eventId } = await params;
    const adminClient = createAdminClient();

    const winners = await getDrawWinners(adminClient, eventId);

    return NextResponse.json({
      winners,
      count: winners.length,
    });
  } catch (error) {
    console.error('Error obteniendo ganadores:', error);
    return NextResponse.json(
      { error: 'Error al obtener ganadores' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]/draw/winners
 * Resetear el historial de ganadores. Solo el organizador puede hacerlo.
 */
export async function DELETE(request: NextRequest, { params }: Props) {
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

    // Verificar que el usuario es el organizador
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

    await clearDrawWinners(adminClient, eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al resetear ganadores:', error);
    return NextResponse.json(
      { error: 'Error al resetear el historial de ganadores' },
      { status: 500 }
    );
  }
}
