import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventById } from '@/services/event.service';
import { getUploadSignedUrl } from '@/services/upload.service';
import { uploadUrlSchema } from '@/lib/validations/photo-schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // Verify guest profile exists
    const { data: guest } = await adminClient
      .from('guest_profiles')
      .select('id, is_blocked')
      .eq('id', validated.guest_id)
      .eq('event_id', validated.event_id)
      .eq('auth_user_id', user.id)
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
