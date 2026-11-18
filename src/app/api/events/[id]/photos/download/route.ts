import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { downloadPhotoBuffer } from '@/lib/cloudinary/upload';
import { verifyEventAccess } from '@/lib/security/idor-protection';
import JSZip from 'jszip';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const hasAccess = await verifyEventAccess(adminClient, eventId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    // Get event info for the filename
    const { data: event } = await adminClient
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    // Get all photos for this event
    const { data: photos, error: photosError } = await adminClient
      .from('photos')
      .select('id, storage_key, original_filename, mime_type')
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (photosError) throw photosError;
    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: 'No hay fotos para descargar' }, { status: 404 });
    }

    // Limit to 200 photos to avoid memory issues
    const photosToDownload = photos.slice(0, 200);

    const zip = new JSZip();

    // Download each photo from Cloudinary and add to ZIP
    for (let i = 0; i < photosToDownload.length; i++) {
      const photo = photosToDownload[i];
      const filename = photo.original_filename || `photo-${photo.id}.jpg`;

      try {
        const buffer = await downloadPhotoBuffer(photo.storage_key);
        if (buffer) {
          zip.file(filename, buffer);
        }
      } catch (err) {
        console.error(`Error downloading photo ${photo.id}:`, err);
        // Continue with other photos
      }
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const eventName = event?.name?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'event';
    const downloadFilename = `xalt-moments-${eventName}.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
      },
    });
  } catch (error) {
    console.error('ZIP download error:', error);
    return NextResponse.json({ error: 'Error al generar el ZIP' }, { status: 500 });
  }
}
