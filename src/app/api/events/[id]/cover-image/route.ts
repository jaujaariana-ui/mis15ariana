import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventById, updateEvent } from '@/services/event.service';
import { verifyEventAccess } from '@/lib/security/idor-protection';
import { cloudinary } from '@/lib/cloudinary/client';
import { getPhotoUrl } from '@/lib/cloudinary/upload';

const CLOUDINARY_FOLDER = 'xalt-moments/cover_images';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET - Return the current cover image URL for an event.
 */
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

    const event = await getEventById(adminClient, id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const coverImageUrl = event.cover_image ? getPhotoUrl(event.cover_image) : null;
    return NextResponse.json({ cover_image: event.cover_image, url: coverImageUrl });
  } catch (error) {
    console.error('Get cover image error:', error);
    return NextResponse.json({ error: 'Error al obtener imagen de portada' }, { status: 500 });
  }
}

/**
 * POST - Upload a new cover image for an event.
 * Expects multipart/form-data with a 'file' field.
 */
export async function POST(request: NextRequest, { params }: Props) {
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

    const event = await getEventById(adminClient, id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use JPEG, PNG o WebP.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    // Delete old cover image if exists
    if (event.cover_image) {
      try {
        await cloudinary.v2.uploader.destroy(event.cover_image);
        console.log(`Deleted old cover image: ${event.cover_image}`);
      } catch (deleteError) {
        console.warn('Failed to delete old cover image:', deleteError);
      }
    }

    // Upload new image to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a temporary file path for upload
    const tempPath = `/tmp/cover-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        {
          folder: CLOUDINARY_FOLDER,
          public_id: `event_${id}`,
          overwrite: true,
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });

    const storageKey = uploadResult.public_id;
    const url = getPhotoUrl(storageKey);

    console.log(`Uploaded cover image for event ${id}: ${storageKey}`);

    // Update event with new cover image
    const updatedEvent = await updateEvent(adminClient, id, { cover_image: storageKey });

    return NextResponse.json({
      success: true,
      cover_image: storageKey,
      url,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Upload cover image error:', error);
    return NextResponse.json({ error: 'Error al subir imagen de portada' }, { status: 500 });
  }
}

/**
 * DELETE - Remove the cover image from an event.
 */
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
    const hasAccess = await verifyEventAccess(adminClient, id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    const event = await getEventById(adminClient, id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (!event.cover_image) {
      return NextResponse.json({ success: true, message: 'No hay imagen de portada que eliminar' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.v2.uploader.destroy(event.cover_image);
      console.log(`Deleted cover image: ${event.cover_image}`);
    } catch (deleteError) {
      console.warn('Failed to delete cover image from Cloudinary:', deleteError);
    }

    // Update event to remove cover image
    const updatedEvent = await updateEvent(adminClient, id, { cover_image: null });

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Delete cover image error:', error);
    return NextResponse.json({ error: 'Error al eliminar imagen de portada' }, { status: 500 });
  }
}
