import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventPhotos } from '@/services/photo.service';
import { verifyEventAccess } from '@/lib/security/idor-protection';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
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
    const hasAccess = await verifyEventAccess(adminClient, id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const photos = await getEventPhotos(adminClient, id, limit, offset);
    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Get event photos error:', error);
    return NextResponse.json({ error: 'Error al obtener fotos' }, { status: 500 });
  }
}
