import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getActiveDrawSession,
  updateDrawSession,
  addDrawWinner,
} from '@/services/draw.service';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/events/[id]/draw/finish
 * Finalizar el sorteo activo. Solo el organizador puede hacerlo.
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

    // Obtener sesión activa
    const activeSession = await getActiveDrawSession(adminClient, eventId);
    if (!activeSession) {
      return NextResponse.json(
        { error: 'No hay un sorteo activo' },
        { status: 400 }
      );
    }

    // Finalizar la sesión
    const finishedSession = await updateDrawSession(adminClient, activeSession.id, {
      status: 'finished',
      finished_at: new Date().toISOString(),
    });

    // Guardar el ganador en el historial
    if (finishedSession.winner_participant_id && finishedSession.winner_display_name) {
      try {
        await addDrawWinner(
          adminClient,
          eventId,
          finishedSession.winner_participant_id,
          finishedSession.winner_display_name,
          activeSession.id
        );
      } catch (winnerError) {
        console.error('Error al guardar ganador en historial:', winnerError);
        // No fallar el sorteo si no se puede guardar en el historial
      }
    }

    return NextResponse.json({
      session: finishedSession,
      winner: {
        id: finishedSession.winner_participant_id,
        display_name: finishedSession.winner_display_name,
      },
    });
  } catch (error) {
    console.error('Error finalizando sorteo:', error);
    return NextResponse.json(
      { error: 'Error al finalizar el sorteo' },
      { status: 500 }
    );
  }
}
