import { SupabaseClient } from '@supabase/supabase-js';
import { GuestProfile, CreateGuestProfileInput } from '@/types/guest.types';

export async function displayNameExists(
  supabase: SupabaseClient,
  displayName: string,
  eventId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('guest_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .ilike('display_name', displayName);

  return (count || 0) > 0;
}

export async function getOrCreateGuestProfile(
  supabase: SupabaseClient,
  authUserId: string,
  input: CreateGuestProfileInput
): Promise<GuestProfile> {
  // Check if profile already exists for this event
  const { data: existing } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('event_id', input.event_id)
    .single();

  if (existing) {
    return existing;
  }

  // Create new profile
  const { data, error } = await supabase
    .from('guest_profiles')
    .insert({
      auth_user_id: authUserId,
      display_name: input.display_name,
      event_id: input.event_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGuestProfile(
  supabase: SupabaseClient,
  authUserId: string,
  eventId: string
): Promise<GuestProfile | null> {
  const { data, error } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('event_id', eventId)
    .single();

  if (error) return null;
  return data;
}

export async function getEventGuests(
  supabase: SupabaseClient,
  eventId: string
): Promise<GuestProfile[]> {
  const { data, error } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function blockGuest(
  supabase: SupabaseClient,
  guestId: string,
  isBlocked: boolean
): Promise<GuestProfile> {
  const { data, error } = await supabase
    .from('guest_profiles')
    .update({ is_blocked: isBlocked })
    .eq('id', guestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGuestPhotoCount(
  supabase: SupabaseClient,
  guestId: string
): Promise<number> {
  const { count } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('guest_id', guestId)
    .is('deleted_at', null);

  return count || 0;
}
