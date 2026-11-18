import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPhotoById } from '@/services/photo.service';
import { getDownloadUrl } from '@/lib/cloudinary/upload';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    const photo = await getPhotoById(adminClient, id);
    if (!photo) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
    }

    const downloadUrl = getDownloadUrl(photo.storage_key);

    // Redirect to Cloudinary download URL
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Download photo error:', error);
    return NextResponse.json({ error: 'Error al obtener foto' }, { status: 500 });
  }
}
