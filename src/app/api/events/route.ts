import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createEvent, getOrganizerEvents, updateEvent } from '@/services/event.service';
import { createEventSchema } from '@/lib/validations/event-schemas';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: organizer } = await adminClient
      .from('organizers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ events: [] });
    }

    const events = await getOrganizerEvents(adminClient, organizer.id);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json({ error: 'Error al obtener eventos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in create event:', authError);
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: organizer, error: organizerError } = await adminClient
      .from('organizers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (organizerError || !organizer) {
      console.error('Organizer error:', organizerError);
      return NextResponse.json({ error: 'No eres organizador' }, { status: 403 });
    }

    const body = await request.json();
    
    let validated;
    try {
      validated = createEventSchema.parse(body);
    } catch (schemaError) {
      console.error('Validation error:', schemaError);
      if (schemaError instanceof Error) {
        return NextResponse.json({ error: schemaError.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const event = await createEvent(adminClient, organizer.id, validated);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Validation') || errorMessage.includes('ZodError')) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 });
  }
}
