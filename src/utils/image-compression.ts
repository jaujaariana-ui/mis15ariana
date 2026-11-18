const MAX_DIMENSION = 1920;
const QUALITY = 0.8;

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize to max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_DIMENSION;
          width = MAX_DIMENSION;
        } else {
          width = (width / height) * MAX_DIMENSION;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto del canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fallback to JPEG
      const mimeType = 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width: Math.round(width),
              height: Math.round(height),
              mimeType,
            });
          } else {
            // Fallback to JPEG
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve({
                    blob: jpegBlob,
                    width: Math.round(width),
                    height: Math.round(height),
                    mimeType: 'image/jpeg',
                  });
                } else {
                  reject(new Error('No se pudo comprimir la imagen'));
                }
              },
              'image/jpeg',
              QUALITY
            );
          }
        },
        mimeType,
        QUALITY
      );
    };

    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = URL.createObjectURL(file);
  });
}
