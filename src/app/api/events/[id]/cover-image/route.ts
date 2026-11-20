import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventById, updateEvent } from '@/services/event.service';
import { verifyEventAccess } from '@/lib/security/idor-protection';
import { cloudinary } from '@/lib/cloudinary/client';
import { getPhotoUrl, toCloudinaryPublicId } from '@/lib/cloudinary/upload';

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
 * POST - Update the event's cover image with the storage key.
 * The image is already uploaded to Cloudinary by the client via direct upload.
 * This endpoint only updates the database record.
 * Expects JSON body: { storageKey: string }
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

    // Parse JSON body
    const body = await request.json();
    const { storageKey } = body;

    if (!storageKey || typeof storageKey !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere el storageKey de la imagen' },
        { status: 400 }
      );
    }

    // Delete old cover image from Cloudinary if exists
    if (event.cover_image && event.cover_image !== storageKey) {
      try {
        await cloudinary.v2.uploader.destroy(toCloudinaryPublicId(event.cover_image));
        console.log(`Deleted old cover image: ${event.cover_image}`);
      } catch (deleteError) {
        console.warn('Failed to delete old cover image:', deleteError);
      }
    }

    // Update event with new cover image
    const updatedEvent = await updateEvent(adminClient, id, { cover_image: storageKey });

    const url = getPhotoUrl(storageKey);

    console.log(`Updated cover image for event ${id}: ${storageKey}`);

    return NextResponse.json({
      success: true,
      cover_image: storageKey,
      url,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Update cover image error:', error);
    return NextResponse.json({ error: 'Error al actualizar imagen de portada' }, { status: 500 });
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
      await cloudinary.v2.uploader.destroy(toCloudinaryPublicId(event.cover_image));
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
