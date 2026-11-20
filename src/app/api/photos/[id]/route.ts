import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deletePhoto } from '@/services/photo.service';
import { verifyPhotoOwnership } from '@/lib/security/idor-protection';
import { verifyGuestToken, GUEST_COOKIE_NAME } from '@/lib/guest-token';

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const adminClient = createAdminClient();

    // Query photo without filtering by deleted_at to detect already-deleted photos
    const { data: photo, error: photoError } = await adminClient
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
    }

    // Check if already soft-deleted
    if (photo.deleted_at) {
      return NextResponse.json({ error: 'Esta foto ya fue eliminada' }, { status: 400 });
    }

    // Try to authenticate as organizer (Supabase Auth) first
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!authError && user) {
      // User is an authenticated organizer/admin
      const { owned, is_admin } = await verifyPhotoOwnership(adminClient, id, user.id);
      if (!owned && !is_admin) {
        return NextResponse.json(
          { error: 'No puedes eliminar esta foto. Solo puedes eliminar tus propias fotos.' },
          { status: 403 }
        );
      }
      await deletePhoto(adminClient, id, photo.storage_key);
      return NextResponse.json({ success: true });
    }

    // Try to authenticate as guest (JWT cookie)
    const token = request.cookies.get(GUEST_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyGuestToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verify guest profile exists and matches the token
    const { data: guest } = await adminClient
      .from('guest_profiles')
      .select('id, is_blocked')
      .eq('id', payload.guest_id)
      .eq('event_id', photo.event_id)
      .single();

    if (!guest) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Check if the guest owns this photo
    if (photo.guest_id !== payload.guest_id) {
      return NextResponse.json(
        { error: 'No puedes eliminar esta foto. Solo puedes eliminar tus propias fotos.' },
        { status: 403 }
      );
    }

    await deletePhoto(adminClient, id, photo.storage_key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json({ error: 'Error al eliminar foto' }, { status: 500 });
  }
}
