import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventById } from '@/services/event.service';
import { generateQRCodePNG } from '@/services/qr.service';
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

    const event = await getEventById(adminClient, id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const eventUrl = `${appUrl}/e/${event.slug}`;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'png';

    if (format === 'png') {
      const pngBuffer = await generateQRCodePNG(eventUrl, { width: 512 });
      return new NextResponse(pngBuffer as unknown as Blob, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="qr-${event.slug}.png"`,
        },
      });
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Error al generar QR' }, { status: 500 });
  }
}
