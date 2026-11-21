import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getEligibleParticipants,
  getActiveDrawSession,
  getLatestFinishedDrawSession,
  createDrawSession,
  updateDrawSession,
  selectRandomWinner,
  getDrawSessionsHistory,
} from '@/services/draw.service';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/draw
 * Obtener el estado actual del sorteo para un evento.
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: eventId } = await params;
    const adminClient = createAdminClient();

    const [activeSession, finishedSession] = await Promise.all([
      getActiveDrawSession(adminClient, eventId),
      getLatestFinishedDrawSession(adminClient, eventId),
    ]);

    // Si hay una sesión activa, devolverla
    // Si no, devolver la última finalizada
    const session = activeSession || finishedSession;

    return NextResponse.json({
      session,
      activeSession,
    });
  } catch (error) {
    console.error('Error obteniendo estado del sorteo:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado del sorteo' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/draw
 * Iniciar un nuevo sorteo. Solo el organizador puede hacerlo.
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

    // Verificar que no hay un sorteo activo
    const activeSession = await getActiveDrawSession(adminClient, eventId);
    if (activeSession) {
      return NextResponse.json(
        { error: 'Ya hay un sorteo en curso' },
        { status: 409 }
      );
    }

    // Obtener participantes elegibles
    const participants = await getEligibleParticipants(adminClient, eventId);
    if (participants.length === 0) {
      return NextResponse.json(
        { error: 'No hay participantes elegibles para el sorteo' },
        { status: 400 }
      );
    }

    // Seleccionar ganador aleatoriamente (servidor, criptográficamente seguro)
    const winner = selectRandomWinner(participants);
    if (!winner) {
      return NextResponse.json(
        { error: 'Error al seleccionar ganador' },
        { status: 500 }
      );
    }

    // Leer duración de animación del body (opcional)
    const body = await request.json().catch(() => ({}));
    const animationDurationMs = body.animationDurationMs || 5000;

    // Crear sesión de sorteo
    const session = await createDrawSession(
      adminClient,
      eventId,
      organizer.id,
      animationDurationMs
    );

    // Actualizar a "running" con el ganador
    const runningSession = await updateDrawSession(adminClient, session.id, {
      status: 'running',
      started_at: new Date().toISOString(),
      winner_participant_id: winner.id,
      winner_display_name: winner.display_name,
    });

    return NextResponse.json({
      session: runningSession,
      winner: {
        id: winner.id,
        display_name: winner.display_name,
      },
      participants,
    });
  } catch (error) {
    console.error('Error iniciando sorteo:', error);
    return NextResponse.json(
      { error: 'Error al iniciar el sorteo' },
      { status: 500 }
    );
  }
}
