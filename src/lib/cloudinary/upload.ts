import crypto from 'crypto';
import { cloudinary } from './client';

const CLOUDINARY_FOLDER = 'xalt-moments';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';

/**
 * Generate a signed upload parameter set for direct browser upload to Cloudinary.
 * The API secret never leaves the server.
 */
export function generateSignedUploadParams(
  publicId: string,
  folder: string
): {
  apiKey: string;
  timestamp: number;
  signature: string;
  uploadPreset?: string;
} {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  // Build the signature string: folder=...&public_id=...&timestamp=...
  const signatureString = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  return {
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
  };
}

/**
 * Build the full public storage key for a photo in Cloudinary.
 * Includes the CLOUDINARY_FOLDER prefix so the key matches the actual Cloudinary public_id.
 */
export function buildStorageKey(eventId: string, timestamp: number, random: string, extension: string): string {
  const publicId = `${CLOUDINARY_FOLDER}/events/${eventId}/${timestamp}-${random}.${extension}`;
  return publicId;
}

/**
 * Get the Cloudinary URL for a photo by its public ID (storage key).
 * Cloudinary delivers optimized images automatically.
 * Server-only: uses the Cloudinary SDK.
 */
export function getPhotoUrl(storageKey: string, transformations?: { width?: number; height?: number; crop?: string }): string {
  const transformationsArray: any[] = [];
  
  if (transformations) {
    if (transformations.width && transformations.height) {
      transformationsArray.push({
        width: transformations.width,
        height: transformations.height,
        crop: transformations.crop || 'fill',
      });
    }
  }

  transformationsArray.push({
    fetch_format: 'auto',
    quality: 'auto',
  });

  return cloudinary.v2.url(storageKey, {
    secure: true,
    transformation: transformationsArray,
  });
}

/**
 * Client-safe version of getPhotoUrl that builds the URL manually without the Cloudinary SDK.
 * Can be used in Client Components.
 */
export function getPhotoUrlClient(storageKey: string, transformations?: { width?: number; height?: number; crop?: string }): string {
  const parts: string[] = [];
  
  if (transformations) {
    if (transformations.width && transformations.height) {
      parts.push(`w_${transformations.width},h_${transformations.height},c_${transformations.crop || 'fill'}`);
    }
  }
  
  parts.push('f_auto,q_auto');
  
  const transformation = parts.length > 0 ? parts.join('/') + '/' : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformation}${storageKey}`;
}

/**
 * Get a download URL that forces the original file download.
 */
export function getDownloadUrl(storageKey: string): string {
  return cloudinary.v2.url(storageKey, {
    secure: true,
    download: true,
    filename_override: storageKey.split('/').pop() || storageKey,
  });
}

/**
 * Delete a photo from Cloudinary.
 */
export async function deletePhotoFromCloudinary(storageKey: string): Promise<void> {
  const { result } = await cloudinary.v2.uploader.destroy(storageKey);
  if (result !== 'ok') {
    console.warn(`Cloudinary delete returned: ${result} for ${storageKey}`);
  }
}

/**
 * Download a photo buffer from Cloudinary for ZIP export.
 * Uses the secure URL with download parameter to fetch the original file.
 */
export async function downloadPhotoBuffer(storageKey: string): Promise<Buffer | null> {
  try {
    // Build a download URL that returns the original file
    const downloadUrl = cloudinary.v2.url(storageKey, {
      secure: true,
      download: true,
    });
    
    // Fetch the file
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error downloading photo from Cloudinary: ${storageKey}`, error);
    return null;
  }
}

/**
 * Get Cloudinary folder prefix for an event.
 */
export function getEventFolder(eventId: string): string {
  return `${CLOUDINARY_FOLDER}/events/${eventId}`;
}
