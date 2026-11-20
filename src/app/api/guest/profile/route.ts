import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrCreateGuestProfile } from '@/services/guest.service';
import { v4 as uuidv4 } from 'uuid';
import { generateGuestToken, verifyGuestToken, getGuestCookieOptions, GUEST_COOKIE_NAME } from '@/lib/guest-token';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const token = cookies.get(GUEST_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ profile: null });
    }

    const payload = verifyGuestToken(token);
    if (!payload) {
      return NextResponse.json({ profile: null });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'event_id requerido' }, { status: 400 });
    }

    // Verify the token matches the requested event
    if (payload.event_id !== eventId) {
      return NextResponse.json({ profile: null });
    }

    const adminClient = createAdminClient();
    
    // Look up the guest profile directly by guest_id
    const { data: profile, error } = await adminClient
      .from('guest_profiles')
      .select('*')
      .eq('id', payload.guest_id)
      .eq('event_id', eventId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ profile: null });
    }

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

    // Generate a local UUID instead of creating a Supabase Auth user
    const authUserId = uuidv4();

    // Create the guest profile directly in the database
    const profile = await getOrCreateGuestProfile(adminClient, authUserId, {
      display_name: display_name.trim(),
      event_id,
    });

    // Generate a JWT token for this guest
    const token = generateGuestToken({
      guest_id: profile.id,
      auth_user_id: authUserId,
      event_id,
    });

    const response = NextResponse.json({ profile }, { status: 201 });
    response.cookies.set(GUEST_COOKIE_NAME, token, getGuestCookieOptions());

    return response;
  } catch (error) {
    console.error('Create guest profile error:', error);
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 });
  }
}
