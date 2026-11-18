import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerPhoto } from '@/services/photo.service';
import { uploadPhotoSchema } from '@/lib/validations/photo-schemas';

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
    const validated = uploadPhotoSchema.parse(body);

    const adminClient = createAdminClient();

    // Verify guest ownership and check if blocked
    const { data: guest } = await adminClient
      .from('guest_profiles')
      .select('id, is_blocked')
      .eq('id', validated.guest_id)
      .eq('auth_user_id', user.id)
      .single();

    if (!guest) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (guest.is_blocked) {
      return NextResponse.json({ error: 'Has sido bloqueado de este evento' }, { status: 403 });
    }

    // Check event status
    const { data: event } = await adminClient
      .from('events')
      .select('status, expires_at')
      .eq('id', validated.event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (event.status === 'closed' || event.status === 'expired') {
      return NextResponse.json({ error: 'Este evento ya no acepta fotos' }, { status: 403 });
    }

    if (event.expires_at && new Date(event.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este evento ha expirado' }, { status: 403 });
    }

    const photo = await registerPhoto(adminClient, validated);
    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Register photo error:', error);
    return NextResponse.json({ error: 'Error al registrar foto' }, { status: 500 });
  }
}
