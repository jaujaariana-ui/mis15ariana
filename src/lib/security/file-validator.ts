const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  size: number;
  error?: string;
}

export async function validateFile(file: File): Promise<FileValidationResult> {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      mimeType: file.type,
      size: file.size,
      error: 'Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG, WebP, GIF, HEIC y HEIF.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      mimeType: file.type,
      size: file.size,
      error: `El archivo es demasiado grande. El tamaño máximo es ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  // Check file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      mimeType: file.type,
      size: file.size,
      error: 'El archivo está vacío.',
    };
  }

  // Verify magic bytes for additional security
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isValidImage = verifyMagicBytes(bytes);

  if (!isValidImage) {
    return {
      valid: false,
      mimeType: file.type,
      size: file.size,
      error: 'El archivo no es una imagen válida.',
    };
  }

  return {
    valid: true,
    mimeType: file.type,
    size: file.size,
  };
}

function verifyMagicBytes(bytes: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }
  // GIF: 47 49 46 38
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return true;
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  // HEIC/HEIF: Starts with 'ftyp' at offset 4, then 'heic'/'heix'/'mif1' at offset 8
  if (
    bytes[4] === 0x66 && // 'f'
    bytes[5] === 0x74 && // 't'
    bytes[6] === 0x79 && // 'y'
    bytes[7] === 0x70    // 'p'
  ) {
    // Check for HEIC/HEIF variants
    const isHeic =
      (bytes[8] === 0x68 && bytes[9] === 0x65 && bytes[10] === 0x69) || // 'hei'
      (bytes[8] === 0x6d && bytes[9] === 0x69 && bytes[10] === 0x66);   // 'mif'
    if (isHeic) return true;
  }
  return false;
}
