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

  // Check if the user is an admin of the event
  const { data: isAdmin } = await supabase
    .from('event_admins')
    .select('id')
    .eq('event_id', photo.event_id)
    .eq('user_id', userId)
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

  if (event && event.organizer_id === userId) {
    return { owned: false, is_admin: true };
  }

  return { owned: false, is_admin: false };
}

export async function verifyEventAccess(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data: event } = await supabase
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single();

  if (!event) return false;

  if (event.organizer_id === userId) return true;

  const { data: isAdmin } = await supabase
    .from('event_admins')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  return !!isAdmin;
}
