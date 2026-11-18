import { SupabaseClient } from '@supabase/supabase-js';
import { buildStorageKey, generateSignedUploadParams, getEventFolder } from '@/lib/cloudinary/upload';

export async function getUploadSignedUrl(
  eventId: string,
  mimeType: string,
  originalFilename: string
): Promise<{ uploadUrl: string; storageKey: string; signature: string; timestamp: number; apiKey: string }> {
  // Generate a unique storage key
  const extension = originalFilename.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const storageKey = buildStorageKey(eventId, timestamp, random, extension);

  const folder = getEventFolder(eventId);
  // storageKey now includes the full path: xalt-moments/events/{eventId}/{name}.{ext}
  // public_id for signature should be just the filename part
  const publicId = storageKey.replace(`${folder}/`, '');
  
  const { apiKey, timestamp: signatureTimestamp, signature } = generateSignedUploadParams(publicId, folder);

  // Cloudinary upload endpoint
  const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

  return { uploadUrl, storageKey, signature, timestamp: signatureTimestamp, apiKey };
}

export async function uploadPhotoToCloudinary(
  uploadUrl: string,
  file: Blob,
  mimeType: string,
  signature: string,
  timestamp: number,
  apiKey: string,
  folder: string,
  publicId: string
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file as File, 'photo.jpg');
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('public_id', publicId);
  formData.append('resource_type', 'image');

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al subir la foto a Cloudinary: ${errorText}`);
  }
}
