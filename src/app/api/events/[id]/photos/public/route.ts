import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface Props {
  params: Promise<{ id: string }>;
}

// Enable Edge runtime for faster responses and better concurrency
export const runtime = 'edge';

// Disable page-level revalidation — cache is controlled per-response via Cache-Control headers.
// Photos are updated in real-time via Supabase Realtime, so stale cache must be avoided
// to prevent deleted photos from reappearing.
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const adminClient = createAdminClient();

    // Verify event exists and is active
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

    // Fetch photos with guest display names using admin client (bypasses RLS)
    const { data: photos, error: photosError } = await adminClient
      .from('photos')
      .select(`
        *,
        guest_profiles!photos_guest_id_fkey(display_name)
      `)
      .eq('event_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return NextResponse.json({ error: 'Error al obtener fotos' }, { status: 500 });
    }

    const mappedPhotos = (photos || []).map((photo) => ({
      ...photo,
      guest_display_name: photo.guest_profiles?.display_name || null,
    }));

    // Disable caching for photo listings to prevent deleted photos from reappearing.
    // Supabase Realtime handles live updates, so fresh data is always preferred.
    const response = NextResponse.json({ photos: mappedPhotos });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Vary', 'Accept-Encoding');
    return response;
  } catch (error) {
    console.error('Public photos API error:', error);
    return NextResponse.json({ error: 'Error al obtener fotos' }, { status: 500 });
  }
}
