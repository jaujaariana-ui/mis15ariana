'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compressImage, readImageSize } from '@/utils/image-compression';
import { validateFile } from '@/lib/security/file-validator';
import { PhotoUploadItem } from '@/components/upload/upload-progress';

export interface UploadState {
  uploading: boolean;
  progress: number;
  total: number;
  completed: number;
  failed: number;
  error: string | null;
}

export interface UploadOptions {
  // Cuando el archivo ya viene optimizado (p. ej. la captura de cámara ya está
  // codificada en JPEG a resolución nativa), se omite la recompresión para no
  // perder calidad con una segunda generación ni gastar CPU en el canvas.
  preOptimized?: boolean;
}

// Subidas simultáneas por invitado. Secuencial (1) hacía esperar N veces por N
// fotos; ilimitado saturaría la red compartida del evento. Dos reduce la espera
// percibida sin crear picos de tráfico.
const UPLOAD_CONCURRENCY = 2;
const SIGN_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 30_000;
const REGISTER_TIMEOUT_MS = 15_000;

// Evita que una petición colgada bloquee la cola de subida en redes inestables.
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function describeFetchError(err: unknown, fallback: string): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'La conexión tardó demasiado';
  }
  return err instanceof Error ? err.message : fallback;
}

export function useUpload(eventId: string, guestId: string) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    total: 0,
    completed: 0,
    failed: 0,
    error: null,
  });

  const [items, setItems] = useState<PhotoUploadItem[]>([]);
  const abortRef = useRef<Set<boolean>>(new Set());

  const updateItemStatus = useCallback((itemId: string, status: PhotoUploadItem['status'], progress = 0, error?: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status, progress, error: error || item.error } : item
      )
    );
  }, []);

  const uploadSingleFile = useCallback(
    async (file: File, itemId: string, previewUrl: string, preOptimized = false) => {
      // Validate file
      const validation = await validateFile(file);
      if (!validation.valid) {
        updateItemStatus(itemId, 'error', 0, validation.error || 'Archivo no válido');
        return false;
      }

      // Prepare image: comprimir o medir sin recomprimir si ya viene optimizado
      updateItemStatus(itemId, 'compressing', 0);
      let compressed;
      try {
        if (preOptimized) {
          const size = await readImageSize(file);
          compressed = {
            blob: file as Blob,
            width: size.width,
            height: size.height,
            mimeType: file.type || 'image/jpeg',
          };
        } else {
          compressed = await compressImage(file);
        }
      } catch {
        updateItemStatus(itemId, 'error', 0, 'Error al preparar la imagen');
        return false;
      }

      // Get signed upload params from API with retry for high-concurrency scenarios
      updateItemStatus(itemId, 'uploading', 10);
      let uploadUrl = '';
      let storageKey = '';
      let signature = '';
      let timestamp = 0;
      let apiKey = '';
      let uploadUrlSuccess = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
        try {
          const uploadUrlResponse = await fetchWithTimeout(
            '/api/photos/upload-url',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: eventId,
                guest_id: guestId,
                mime_type: compressed.mimeType,
                original_filename: file.name,
              }),
            },
            SIGN_TIMEOUT_MS
          );

          if (!uploadUrlResponse.ok) {
            const errorData = await uploadUrlResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al obtener parámetros de subida');
          }

          const data = await uploadUrlResponse.json();
          uploadUrl = data.uploadUrl;
          storageKey = data.storageKey;
          signature = data.signature;
          timestamp = data.timestamp;
          apiKey = data.apiKey;
          uploadUrlSuccess = true;
          break;
        } catch (err) {
          if (attempt === 2) {
            updateItemStatus(itemId, 'error', 0, describeFetchError(err, 'Error de conexión'));
            return false;
          }
        }
      }
      if (!uploadUrlSuccess) {
        updateItemStatus(itemId, 'error', 0, 'No se pudo conectar al servidor');
        return false;
      }

      // Upload directly to Cloudinary with retry for network instability
      updateItemStatus(itemId, 'uploading', 30);
      let secureUrl = storageKey; // fallback to storage_key if Cloudinary doesn't return URL
      let cloudinarySuccess = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        try {
          const formData = new FormData();
          formData.append('file', compressed.blob as Blob, 'photo.jpg');
          formData.append('api_key', apiKey);
          formData.append('timestamp', String(timestamp));
          formData.append('signature', signature);
          const folder = `xalt-moments/events/${eventId}`;
          formData.append('folder', folder);
          // storageKey now includes the full path: xalt-moments/events/{eventId}/{name}.{ext}
          // public_id should be just the filename part
          const publicId = storageKey.replace(`${folder}/`, '');
          formData.append('public_id', publicId);
          formData.append('resource_type', 'image');

          const uploadResponse = await fetchWithTimeout(
            uploadUrl,
            {
              method: 'POST',
              body: formData,
            },
            UPLOAD_TIMEOUT_MS
          );

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Error al subir la foto: ${errorText}`);
          }

          // Parse Cloudinary response to get the secure_url
          const cloudinaryResult = await uploadResponse.json();
          if (cloudinaryResult.secure_url) {
            secureUrl = cloudinaryResult.secure_url;
          }
          cloudinarySuccess = true;
          break;
        } catch (err) {
          if (attempt === 2) {
            updateItemStatus(itemId, 'error', 0, describeFetchError(err, 'Error de red'));
            return false;
          }
        }
      }
      if (!cloudinarySuccess) {
        updateItemStatus(itemId, 'error', 0, 'No se pudo subir la foto a Cloudinary');
        return false;
      }

      updateItemStatus(itemId, 'uploading', 80);

      // Register photo in database with retry
      let registerSuccess = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
        try {
          const registerResponse = await fetchWithTimeout(
            '/api/photos/upload',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: eventId,
                guest_id: guestId,
                storage_key: secureUrl, // Store the full Cloudinary URL
                original_filename: file.name,
                mime_type: compressed.mimeType,
                file_size: compressed.blob.size,
                width: compressed.width,
                height: compressed.height,
              }),
            },
            REGISTER_TIMEOUT_MS
          );

          if (!registerResponse.ok) {
            const errorData = await registerResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al registrar la foto');
          }
          registerSuccess = true;
          break;
        } catch (err) {
          if (attempt === 2) {
            updateItemStatus(itemId, 'error', 0, describeFetchError(err, 'Error de registro'));
            return false;
          }
        }
      }
      if (!registerSuccess) {
        updateItemStatus(itemId, 'error', 0, 'No se pudo registrar la foto');
        return false;
      }

      updateItemStatus(itemId, 'success', 100);
      return true;
    },
    [eventId, guestId, updateItemStatus]
  );

  const uploadFiles = useCallback(
    async (files: File[], options?: UploadOptions) => {
      const preOptimized = options?.preOptimized ?? false;
      const newItems: PhotoUploadItem[] = files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        status: 'pending' as const,
        progress: 0,
      }));

      setItems(newItems);
      setState({
        uploading: true,
        progress: 0,
        total: files.length,
        completed: 0,
        failed: 0,
        error: null,
      });

      let completed = 0;
      let failed = 0;
      let cursor = 0;

      // Subida con concurrencia limitada. Antes era estrictamente secuencial, lo
      // que hacía esperar N veces por N fotos; ahora se procesan hasta 2 a la vez
      // por invitado, reduciendo la espera percibida sin saturar la red del evento.
      const runWorker = async () => {
        while (cursor < files.length) {
          const index = cursor++;
          const item = newItems[index];
          const success = await uploadSingleFile(files[index], item.id, item.previewUrl, preOptimized);

          if (success) {
            completed++;
          } else {
            failed++;
          }

          const doneCount = completed + failed;
          setState((prev) => ({
            ...prev,
            completed: doneCount,
            failed,
            progress: (doneCount / files.length) * 100,
          }));
        }
      };

      const workerCount = Math.min(UPLOAD_CONCURRENCY, files.length);
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

      if (failed > 0) {
        const finishedCount = completed + failed;
        setState((prev) => ({
          ...prev,
          uploading: false,
          progress: (finishedCount / files.length) * 100,
          error: `${failed} foto(s) no se pudieron subir`,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          uploading: false,
          progress: 100,
          error: null,
        }));
      }
    },
    [uploadSingleFile]
  );

  const retryUpload = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      updateItemStatus(itemId, 'pending', 0);
      setState((prev) => ({
        ...prev,
        uploading: true,
        error: null,
      }));

      // Recreate file from preview URL
      try {
        const response = await fetch(item.previewUrl);
        const blob = await response.blob();
        const file = new File([blob], item.name, { type: 'image/jpeg' });
        const success = await uploadSingleFile(file, itemId, item.previewUrl);

        if (!success) {
          setState((prev) => ({
            ...prev,
            failed: prev.failed + 1,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            completed: prev.completed + 1,
            failed: Math.max(0, prev.failed - 1),
            error: null,
          }));
        }
      } catch {
        updateItemStatus(itemId, 'error', 0, 'Error al reintentar');
      }
    },
    [items, uploadSingleFile, updateItemStatus]
  );

  const clearItems = useCallback(() => {
    setItems((prev) => {
      // Libera los object URLs de previsualización para evitar fugas de memoria
      // cuando un invitado sube muchas fotos en una sola sesión.
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setState({
      uploading: false,
      progress: 0,
      total: 0,
      completed: 0,
      failed: 0,
      error: null,
    });
  }, []);

  return { state, items, uploadFiles, retryUpload, clearItems };
}
