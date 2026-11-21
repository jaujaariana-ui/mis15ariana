import { SupabaseClient } from '@supabase/supabase-js';
import { DrawSession, DrawParticipant, DrawWinner } from '@/types/draw.types';

/**
 * Obtener participantes elegibles para el sorteo.
 * Solo incluyen invitados que han subido al menos una foto, no están bloqueados
 * y no han ganado un sorteo anteriormente.
 */
export async function getEligibleParticipants(
  supabase: SupabaseClient,
  eventId: string
): Promise<DrawParticipant[]> {
  // 1. Obtener todos los guest_ids que tienen fotos activas (no eliminadas)
  const { data: photosData, error: photosError } = await supabase
    .from('photos')
    .select('guest_id')
    .eq('event_id', eventId)
    .is('deleted_at', null);

  if (photosError) {
    console.error('Error obteniendo fotos:', photosError);
    return [];
  }

  const guestsWithPhotos = new Set(photosData?.map(p => p.guest_id).filter(Boolean) || []);
  if (guestsWithPhotos.size === 0) return [];

  // 1.5. Obtener los IDs de los ganadores anteriores para excluirlos
  const { data: winnersData } = await supabase
    .from('draw_winners')
    .select('participant_id')
    .eq('event_id', eventId);

  const winnerIds = new Set(winnersData?.map(w => w.participant_id) || []);

  // 2. Obtener los guest_profiles que no están bloqueados, tienen fotos y no han ganado
  const { data: guests, error: guestsError } = await supabase
    .from('guest_profiles')
    .select('id, display_name')
    .eq('event_id', eventId)
    .eq('is_blocked', false)
    .in('id', Array.from(guestsWithPhotos));

  if (guestsError) {
    console.error('Error obteniendo invitados:', guestsError);
    return [];
  }

  // Filtrar los que ya ganaron
  const eligibleGuests = (guests || []).filter(guest => !winnerIds.has(guest.id));

  // 3. Contar fotos por guest
  const participants: DrawParticipant[] = [];
  for (const guest of eligibleGuests) {
    const { count } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('guest_id', guest.id)
      .eq('event_id', eventId)
      .is('deleted_at', null);

    participants.push({
      id: guest.id,
      display_name: guest.display_name,
      photo_count: count || 0,
    });
  }

  return participants;
}

/**
 * Obtener la sesión activa de sorteo para un evento.
 */
export async function getActiveDrawSession(
  supabase: SupabaseClient,
  eventId: string
): Promise<DrawSession | null> {
  const { data, error } = await supabase
    .from('draw_sessions')
    .select('*')
    .eq('event_id', eventId)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Obtener la última sesión finalizada de sorteo para un evento.
 */
export async function getLatestFinishedDrawSession(
  supabase: SupabaseClient,
  eventId: string
): Promise<DrawSession | null> {
  const { data, error } = await supabase
    .from('draw_sessions')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Crear una nueva sesión de sorteo.
 */
export async function createDrawSession(
  supabase: SupabaseClient,
  eventId: string,
  organizerId: string,
  animationDurationMs: number = 5000
): Promise<DrawSession> {
  const { data, error } = await supabase
    .from('draw_sessions')
    .insert({
      event_id: eventId,
      created_by: organizerId,
      status: 'pending',
      animation_duration_ms: animationDurationMs,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Actualizar el estado de una sesión de sorteo.
 */
export async function updateDrawSession(
  supabase: SupabaseClient,
  sessionId: string,
  updates: Partial<DrawSession>
): Promise<DrawSession> {
  const { data, error } = await supabase
    .from('draw_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Seleccionar un ganador aleatorio de los participantes.
 * Usa crypto.getRandomValues para selección criptográficamente segura.
 */
export function selectRandomWinner(participants: DrawParticipant[]): DrawParticipant | null {
  if (participants.length === 0) return null;

  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const index = array[0] % participants.length;
  return participants[index];
}

/**
 * Obtener todas las sesiones de sorteo para un evento (historial).
 */
export async function getDrawSessionsHistory(
  supabase: SupabaseClient,
  eventId: string
): Promise<DrawSession[]> {
  const { data, error } = await supabase
    .from('draw_sessions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

/**
 * Obtener la lista de ganadores de un evento.
 */
export async function getDrawWinners(
  supabase: SupabaseClient,
  eventId: string
): Promise<DrawWinner[]> {
  const { data, error } = await supabase
    .from('draw_winners')
    .select('*')
    .eq('event_id', eventId)
    .order('won_at', { ascending: false });

  if (error) {
    console.error('Error obteniendo ganadores:', error);
    return [];
  }
  return data || [];
}

/**
 * Agregar un ganador al historial.
 * Verifica primero si ya existe un ganador para la misma sesión para evitar duplicados.
 */
export async function addDrawWinner(
  supabase: SupabaseClient,
  eventId: string,
  participantId: string,
  displayName: string,
  sessionId?: string
): Promise<DrawWinner | null> {
  // Verificar si ya existe un ganador para esta sesión
  if (sessionId) {
    const { data: existing } = await supabase
      .from('draw_winners')
      .select('id')
      .eq('event_id', eventId)
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      console.log('Ganador ya existe para esta sesión, omitiendo insert:', sessionId);
      return null;
    }
  }

  // También verificar si ya existe un ganador con el mismo participant_id y event_id
  const { data: existingByParticipant } = await supabase
    .from('draw_winners')
    .select('id')
    .eq('event_id', eventId)
    .eq('participant_id', participantId)
    .single();

  if (existingByParticipant) {
    console.log('Este participante ya ganó en este evento, omitiendo insert:', participantId);
    return null;
  }

  const { data, error } = await supabase
    .from('draw_winners')
    .insert({
      event_id: eventId,
      participant_id: participantId,
      display_name: displayName,
      session_id: sessionId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Eliminar todos los ganadores de un evento (resetear historial).
 */
export async function clearDrawWinners(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  const { error } = await supabase
    .from('draw_winners')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
}
