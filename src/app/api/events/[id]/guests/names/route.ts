import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface Props {
  params: Promise<{ id: string }>;
}

export const runtime = 'edge';
export const revalidate = 0;

// Máximo de IDs por consulta para acotar el tamaño de la respuesta.
const MAX_IDS = 50;

// Resuelve el nombre visible de invitados concretos de un evento.
// Necesario porque el payload de Realtime solo incluye la fila de `photos`
// (sin la relación con `guest_profiles`) y esa tabla está protegida por RLS.
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get('ids') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, MAX_IDS);

    if (ids.length === 0) {
      return NextResponse.json({ guests: [] });
    }

    const adminClient = createAdminClient();

    // Solo los eventos activos exponen información pública.
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, status')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Evento no activo' }, { status: 403 });
    }

    // El admin client evita el RLS de guest_profiles (visible solo para su dueño o el organizador).
    const { data: guests, error } = await adminClient
      .from('guest_profiles')
      .select('id, display_name')
      .eq('event_id', id)
      .in('id', ids);

    if (error) {
      console.error('Error fetching guest names:', error);
      return NextResponse.json({ error: 'Error al obtener invitados' }, { status: 500 });
    }

    const response = NextResponse.json({ guests: guests || [] });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Guest names API error:', error);
    return NextResponse.json({ error: 'Error al obtener invitados' }, { status: 500 });
  }
}
