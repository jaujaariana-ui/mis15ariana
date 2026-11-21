const MAX_DIMENSION = 4096;
const QUALITY = 0.9;

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

function encode(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, QUALITY);
  });
}

export interface ImageSize {
  width: number;
  height: number;
}

// Mide las dimensiones reales de un blob sin recomprimir ni tocar sus píxeles.
// Se usa para archivos ya optimizados (p. ej. capturas de cámara), que no
// necesitan pasar por el canvas para no perder calidad ni gastar CPU.
export async function readImageSize(file: Blob): Promise<ImageSize> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return { width: img.width, height: img.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);

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

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo obtener el contexto del canvas');
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // WebP suele pesar ~40% menos, pero no todos los navegadores lo codifican
    // (Safari y algunos WebViews devuelven PNG ignorando el formato pedido). Un
    // PNG de 1920px puede pesar hasta 10x más que el original, así que verificamos
    // el tipo REAL del blob y, si no es WebP, preferimos JPEG antes que subir un PNG
    // gigante. Se reporta el tipo real para no registrar un mime_type incorrecto.
    let blob = await encode(canvas, 'image/webp');
    if (!blob || blob.type !== 'image/webp') {
      blob = await encode(canvas, 'image/jpeg');
    }
    if (!blob) {
      throw new Error('No se pudo comprimir la imagen');
    }

    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      mimeType: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg',
    };
  } finally {
    // Libera el objeto URL para evitar fugas de memoria al subir muchas fotos.
    URL.revokeObjectURL(objectUrl);
  }
}
