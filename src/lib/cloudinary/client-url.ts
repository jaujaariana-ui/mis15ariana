/**
 * Client-safe Cloudinary URL builder.
 * Does NOT import the Cloudinary SDK — safe to use in Client Components.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

/**
 * Build a Cloudinary delivery URL.
 * If the storageKey is already a full Cloudinary URL, returns it directly.
 * Otherwise builds a URL from the public_id.
 */
export function getPhotoUrlClient(
  storageKey: string,
  transformations?: { width?: number; height?: number; crop?: string }
): string {
  // If storage_key is already a full URL, use it directly
  if (storageKey.startsWith('http')) {
    return storageKey;
  }

  const parts: string[] = [];

  if (transformations) {
    if (transformations.width && transformations.height) {
      parts.push(
        `w_${transformations.width},h_${transformations.height},c_${
          transformations.crop || 'fill'
        }`
      );
    }
  }

  parts.push('q_auto');

  const transformation = parts.length > 0 ? parts.join('/') + '/' : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformation}${storageKey}`;
}
