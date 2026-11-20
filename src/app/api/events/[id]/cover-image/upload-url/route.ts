import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventById } from '@/services/event.service';
import { verifyEventAccess } from '@/lib/security/idor-protection';
import { generateSignedUploadParams } from '@/lib/cloudinary/upload';

const CLOUDINARY_FOLDER = 'xalt-moments/cover_images';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * POST - Generate signed upload parameters for direct browser upload to Cloudinary.
 * The client uploads the cover image directly to Cloudinary, then calls the POST endpoint
 * to update the event with the new cover_image key.
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

    // Parse request body for file info
    const body = await request.json();
    const { mimeType, originalFilename } = body;

    if (!mimeType || !originalFilename) {
      return NextResponse.json(
        { error: 'Se requiere mimeType y originalFilename' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use JPEG, PNG o WebP.' },
        { status: 400 }
      );
    }

    // Generate a unique public_id for the cover image
    const extension = originalFilename.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const publicId = `event_${id}_${timestamp}-${random}.${extension}`;

    // Generate signed upload parameters
    const { apiKey, timestamp: signatureTimestamp, signature } = generateSignedUploadParams(
      publicId,
      CLOUDINARY_FOLDER
    );

    // Cloudinary upload endpoint
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    // The full storage key that will be saved in the database
    const storageKey = `${CLOUDINARY_FOLDER}/${publicId}`;

    return NextResponse.json({
      uploadUrl,
      storageKey,
      signature,
      timestamp: signatureTimestamp,
      apiKey,
      publicId,
      folder: CLOUDINARY_FOLDER,
    });
  } catch (error) {
    console.error('Cover image upload URL error:', error);
    return NextResponse.json(
      { error: 'Error al generar parámetros de subida' },
      { status: 500 }
    );
  }
}
