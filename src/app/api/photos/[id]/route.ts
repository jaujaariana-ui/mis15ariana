import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deletePhoto } from '@/services/photo.service';
import { verifyPhotoOwnership } from '@/lib/security/idor-protection';

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

    const { owned, is_admin } = await verifyPhotoOwnership(adminClient, id, user.id);
    if (!owned && !is_admin) {
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
