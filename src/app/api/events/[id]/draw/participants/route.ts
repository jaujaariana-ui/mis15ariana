import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEligibleParticipants } from '@/services/draw.service';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: eventId } = await params;
    const adminClient = createAdminClient();

    const participants = await getEligibleParticipants(adminClient, eventId);

    return NextResponse.json({
      participants,
      count: participants.length,
    });
  } catch (error) {
    console.error('Error obteniendo participantes del sorteo:', error);
    return NextResponse.json(
      { error: 'Error al obtener participantes' },
      { status: 500 }
    );
  }
}
