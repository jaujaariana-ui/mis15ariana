import { SupabaseClient } from '@supabase/supabase-js';
import { Event, CreateEventInput, UpdateEventInput } from '@/types/event.types';
import { generateSlug, generateUniqueSlug } from '@/utils/slug-generator';
import { deletePhotoFromCloudinary } from '@/lib/cloudinary/upload';

export async function createEvent(
  supabase: SupabaseClient,
  organizerId: string,
  input: CreateEventInput
): Promise<Event> {
  const baseSlug = generateSlug(input.name);
  const slug = generateUniqueSlug(baseSlug);

  const { data, error } = await supabase
    .from('events')
    .insert({
      name: input.name,
      slug,
      description: input.description || null,
      event_date: input.event_date || null,
      max_photos_per_guest: input.max_photos_per_guest || 20,
      max_file_size_mb: input.max_file_size_mb || 10,
      organizer_id: organizerId,
      expires_at: input.expires_at || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getEventBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

export async function getEventById(
  supabase: SupabaseClient,
  eventId: string
): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) return null;
  return data;
}

export async function updateEvent(
  supabase: SupabaseClient,
  eventId: string,
  input: UpdateEventInput
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(input)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrganizerEvents(
  supabase: SupabaseClient,
  organizerId: string
): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEventStats(
  supabase: SupabaseClient,
  eventId: string
): Promise<{ photoCount: number; guestCount: number }> {
  const { count: photoCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('deleted_at', null);

  const { count: guestCount } = await supabase
    .from('guest_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  return {
    photoCount: photoCount || 0,
    guestCount: guestCount || 0,
  };
}

export async function deleteEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<{ photosDeleted: number }> {
  // First, get all photos for this event to delete them from Cloudinary
  // Include both active and soft-deleted photos to ensure all Cloudinary assets are cleaned up
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('storage_key')
    .eq('event_id', eventId);

  if (photosError) {
    console.error('Error fetching photos for deletion:', photosError);
  }

  let photosDeleted = 0;

  // Delete photos from Cloudinary (in parallel, ignore errors for missing files)
  if (photos && photos.length > 0) {
    console.log(`Found ${photos.length} photos to delete from Cloudinary for event ${eventId}`);
    const deleteResults = await Promise.allSettled(
      photos.map(async (photo) => {
        if (photo.storage_key) {
          await deletePhotoFromCloudinary(photo.storage_key);
          return photo.storage_key;
        }
        return null;
      })
    );

    photosDeleted = deleteResults.filter(
      (r) => r.status === 'fulfilled'
    ).length;

    const failedDeletes = deleteResults.filter(
      (r) => r.status === 'rejected'
    ).length;

    console.log(`Cloudinary deletion complete: ${photosDeleted} succeeded, ${failedDeletes} failed`);
  } else {
    console.log(`No photos found for event ${eventId}`);
  }

  // Delete the event — cascading deletes handle:
  // - photos (ON DELETE CASCADE)
  // - guest_profiles (ON DELETE CASCADE)
  // - event_admins (ON DELETE CASCADE)
  // - rate_limits (ON DELETE CASCADE)
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;

  console.log(`Event ${eventId} deleted from database with ${photosDeleted} photos removed from Cloudinary`);
  return { photosDeleted };
}
