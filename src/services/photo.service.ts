import { SupabaseClient } from '@supabase/supabase-js';
import { Photo, UploadPhotoInput } from '@/types/photo.types';
import { deletePhotoFromCloudinary } from '@/lib/cloudinary/upload';

export async function getEventPhotos(
  supabase: SupabaseClient,
  eventId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select(`
      *,
      guest_profiles!photos_guest_id_fkey(display_name)
    `)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return data.map((photo) => ({
    ...photo,
    guest_display_name: photo.guest_profiles?.display_name || null,
  })) as Photo[];
}

export async function registerPhoto(
  supabase: SupabaseClient,
  input: UploadPhotoInput
): Promise<Photo> {
  const { data, error } = await supabase
    .from('photos')
    .insert({
      event_id: input.event_id,
      guest_id: input.guest_id,
      storage_key: input.storage_key,
      original_filename: input.original_filename,
      mime_type: input.mime_type,
      file_size: input.file_size,
      width: input.width || null,
      height: input.height || null,
      status: 'uploaded',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePhoto(
  supabase: SupabaseClient,
  photoId: string,
  storageKey: string
): Promise<void> {
  // Delete from Cloudinary
  await deletePhotoFromCloudinary(storageKey);

  // Soft delete in database
  const { error } = await supabase
    .from('photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId);

  if (error) throw error;
}

export async function getPhotoById(
  supabase: SupabaseClient,
  photoId: string
): Promise<Photo | null> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .is('deleted_at', null)
    .single();

  if (error) return null;
  return data;
}

export async function getEventPhotoCount(
  supabase: SupabaseClient,
  eventId: string
): Promise<number> {
  const { count } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('deleted_at', null);

  return count || 0;
}
