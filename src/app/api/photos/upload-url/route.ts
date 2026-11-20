import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventById } from '@/services/event.service';
import { getUploadSignedUrl } from '@/services/upload.service';
import { uploadUrlSchema } from '@/lib/validations/photo-schemas';
import { verifyGuestToken, GUEST_COOKIE_NAME } from '@/lib/guest-token';

export async function POST(request: NextRequest) {
  try {
    // Verify guest token from cookie
    const token = request.cookies.get(GUEST_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyGuestToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = uploadUrlSchema.parse(body);

    const adminClient = createAdminClient();

    // Verify event exists and is active
    const event = await getEventById(adminClient, validated.event_id);
    if (!event || event.status !== 'active') {
      return NextResponse.json({ error: 'Evento no válido' }, { status: 400 });
    }

    // Verify guest profile exists and matches the token
    const { data: guest } = await adminClient
      .from('guest_profiles')
      .select('id, is_blocked')
      .eq('id', payload.guest_id)
      .eq('event_id', validated.event_id)
      .single();

    if (!guest) {
      return NextResponse.json({ error: 'Perfil de invitado no encontrado' }, { status: 403 });
    }

    if (guest.is_blocked) {
      return NextResponse.json({ error: 'Has sido bloqueado de este evento' }, { status: 403 });
    }

    const { uploadUrl, storageKey, signature, timestamp, apiKey } = await getUploadSignedUrl(
      validated.event_id,
      validated.mime_type,
      validated.original_filename
    );

    return NextResponse.json({ uploadUrl, storageKey, signature, timestamp, apiKey });
  } catch (error) {
    console.error('Upload URL error:', error);
    return NextResponse.json({ error: 'Error al generar URL de subida' }, { status: 500 });
  }
}
