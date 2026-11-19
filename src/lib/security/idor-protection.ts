import { SupabaseClient } from '@supabase/supabase-js';

export async function verifyPhotoOwnership(
  supabase: SupabaseClient,
  photoId: string,
  userId: string
): Promise<{ owned: boolean; is_admin: boolean }> {
  // Check if the user owns the photo
  const { data: photo } = await supabase
    .from('photos')
    .select('guest_id, event_id')
    .eq('id', photoId)
    .single();

  if (!photo) {
    return { owned: false, is_admin: false };
  }

  // Check if the guest owns the photo by direct guest_id match
  if (photo.guest_id === userId) {
    return { owned: true, is_admin: false };
  }

  // Check if the user's guest profile owns the photo (auth_user_id -> guest profile)
  const { data: guestProfile } = await supabase
    .from('guest_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('event_id', photo.event_id)
    .single();

  if (guestProfile && guestProfile.id === photo.guest_id) {
    return { owned: true, is_admin: false };
  }

  // Translate auth user ID to organizer ID for admin/organizer checks
  const { data: organizer } = await supabase
    .from('organizers')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (organizer) {
    const organizerId = organizer.id;

    // Check if the user is an admin of the event
    const { data: isAdmin } = await supabase
      .from('event_admins')
      .select('id')
      .eq('event_id', photo.event_id)
      .eq('user_id', organizerId)
      .single();

    if (isAdmin) {
      return { owned: false, is_admin: true };
    }

    // Check if the user is the organizer
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', photo.event_id)
      .single();

    if (event && event.organizer_id === organizerId) {
      return { owned: false, is_admin: true };
    }
  }

  return { owned: false, is_admin: false };
}

export async function verifyEventAccess(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<boolean> {
  // First, get the event to check its organizer_id
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single();

  if (eventError) {
    console.log(`verifyEventAccess: Error querying event ${eventId}:`, eventError.message);
  }

  if (!event) {
    console.log(`verifyEventAccess: Event ${eventId} not found`);
    return false;
  }

  console.log(`verifyEventAccess: Event ${eventId} has organizer_id=${event.organizer_id}, user auth_id=${userId}`);

  // Case 1: Check if organizer_id directly matches the auth user ID
  // (some events may have been created storing auth.users.id directly)
  if (event.organizer_id === userId) {
    console.log(`verifyEventAccess: Event organizer_id matches auth user ID directly ✓`);
    return true;
  }

  // Case 2: Translate auth user ID to organizers table ID
  const { data: organizer, error: orgError } = await supabase
    .from('organizers')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (orgError) {
    console.log(`verifyEventAccess: Error querying organizer for user ${userId}:`, orgError.message);
  }

  if (!organizer) {
    console.log(`verifyEventAccess: No organizer found for auth user ${userId}`);
    return false;
  }

  const organizerId = organizer.id;
  console.log(`verifyEventAccess: User ${userId} -> Organizer ${organizerId}`);

  // Check if the user is the organizer via organizers table
  if (event.organizer_id === organizerId) {
    console.log(`verifyEventAccess: User is the event organizer ✓`);
    return true;
  }

  // Check if the user is an admin of the event
  const { data: isAdmin, error: adminError } = await supabase
    .from('event_admins')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', organizerId)
    .single();

  if (adminError) {
    console.log(`verifyEventAccess: Error querying event_admins:`, adminError.message);
  }

  if (isAdmin) {
    console.log(`verifyEventAccess: User is an event admin ✓`);
    return true;
  }

  // Case 3: Check event_admins using auth user ID directly (legacy case)
  const { data: isAdminDirect } = await supabase
    .from('event_admins')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (isAdminDirect) {
    console.log(`verifyEventAccess: User is an event admin (direct auth ID match) ✓`);
    return true;
  }

  console.log(`verifyEventAccess: User is NOT the organizer and NOT an admin ✗`);
  return false;
}
