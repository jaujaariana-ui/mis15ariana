'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPhotoUrlClient } from '@/lib/cloudinary/client-url';

interface CoverImageManagerProps {
  eventId: string;
  initialCoverImage: string | null;
}

export default function CoverImageManager({ eventId, initialCoverImage }: CoverImageManagerProps) {
  const [coverImage, setCoverImage] = useState<string | null>(initialCoverImage);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUrl = coverImage ? getPhotoUrlClient(coverImage) : null;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no permitido. Use JPEG, PNG o WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    uploadCoverImage(file);
  }, []);

  const uploadCoverImage = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get signed upload parameters from our API
      const uploadUrlResponse = await fetch(`/api/events/${eventId}/cover-image/upload-url`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mimeType: file.type,
          originalFilename: file.name,
        }),
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al preparar la subida');
      }

      const { uploadUrl, storageKey, signature, timestamp, apiKey, publicId, folder } =
        await uploadUrlResponse.json();

      // Step 2: Upload directly to Cloudinary from the browser
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file as File, file.name);
      cloudinaryFormData.append('api_key', apiKey);
      cloudinaryFormData.append('timestamp', String(timestamp));
      cloudinaryFormData.append('signature', signature);
      cloudinaryFormData.append('folder', folder);
      cloudinaryFormData.append('public_id', publicId);
      cloudinaryFormData.append('resource_type', 'image');

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Error al subir la imagen: ${errorText}`);
      }

      // Cloudinary returns the full delivery URL. Prefer it over the public_id so the
      // image can be displayed without rebuilding the URL from public env vars.
      const cloudinaryResult = await uploadResponse.json().catch(() => ({}));
      const coverValue: string = cloudinaryResult.secure_url || storageKey;

      // Step 3: Persist the resolved URL on the event
      const updateResponse = await fetch(`/api/events/${eventId}/cover-image`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageKey: coverValue }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar la imagen');
      }

      const updateData = await updateResponse.json().catch(() => ({}));
      setCoverImage(updateData.cover_image || coverValue);
      setPreviewUrl(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir la imagen';
      setError(message);
      setPreviewUrl(null);
      console.error('Upload cover image error:', err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar la imagen de portada?')) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/cover-image`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la imagen');
      }

      setCoverImage(null);
      setPreviewUrl(null);
      console.log('Cover image deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la imagen';
      setError(message);
      console.error('Delete cover image error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de archivo no permitido. Use JPEG, PNG o WebP.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      uploadCoverImage(file);
    },
    []
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const displayUrl = previewUrl || imageUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-gray-500">Imagen de portada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preview area */}
          <div
            className={`relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-colors ${
              displayUrl
                ? 'border-gray-200'
                : 'border-gray-300 hover:border-gray-400 cursor-pointer'
            }`}
            onClick={!displayUrl ? () => fileInputRef.current?.click() : undefined}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Portada del evento"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
                <p className="text-sm">Arrastra una imagen o haz clic para subir</p>
                <p className="text-xs text-gray-300 mt-1">JPEG, PNG o WebP · Máx 10MB</p>
              </div>
            )}

            {/* Overlay with actions when image exists */}
            {displayUrl && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Cambiar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Eliminar
                </Button>
              </div>
            )}
          </div>

          {/* Upload button for empty state */}
          {!displayUrl && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Subiendo...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Subir imagen de portada
                </>
              )}
            </Button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto hover:text-red-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Info text */}
          <p className="text-xs text-gray-400">
            Esta imagen aparecerá como banner principal en la página del evento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
