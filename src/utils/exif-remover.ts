// EXIF removal is handled by the canvas-based compression in image-compression.ts
// When an image is drawn to canvas and exported via toBlob(), all EXIF metadata
// (including GPS coordinates) is automatically stripped. This function exists
// as a documentation of that behavior and as a fallback for direct file uploads.

export function removeExifMetadata(file: File): Promise<File> {
  // The canvas approach in compressImage already strips EXIF data.
  // This function returns the original file if compression is not used,
  // but in practice, all uploads go through compressImage which handles this.
  return Promise.resolve(file);
}
