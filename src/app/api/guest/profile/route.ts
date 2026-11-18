import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrCreateGuestProfile, getGuestProfile } from '@/services/guest.service';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ profile: null });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'event_id requerido' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const profile = await getGuestProfile(adminClient, session.user.id, eventId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get guest profile error:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { display_name, event_id } = await request.json();

    if (!display_name || !event_id) {
      return NextResponse.json(
        { error: 'display_name y event_id requeridos' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Create a temporary user in Supabase Auth for this guest
    const email = `guest-${uuidv4().slice(0, 8)}@temp.xaltmoments.local`;
    const password = uuidv4();

    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      console.error('Create guest user error:', userError);
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
    }

    // Create the guest profile linked to this user
    const profile = await getOrCreateGuestProfile(adminClient, userData.user.id, {
      display_name: display_name.trim(),
      event_id,
    });

    // Sign in the user to get a session
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.error('Sign in guest error:', signInError);
      return NextResponse.json({ error: 'Error de sesión' }, { status: 500 });
    }

    // Return session data so the client can setSession
    return NextResponse.json({
      profile,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create guest profile error:', error);
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 });
  }
}
