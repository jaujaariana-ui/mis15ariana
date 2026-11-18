'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/utils/image-compression';
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
    async (file: File, itemId: string, previewUrl: string) => {
      // Validate file
      const validation = await validateFile(file);
      if (!validation.valid) {
        updateItemStatus(itemId, 'error', 0, validation.error || 'Archivo no válido');
        return false;
      }

      // Compress image
      updateItemStatus(itemId, 'compressing', 0);
      let compressed;
      try {
        compressed = await compressImage(file);
      } catch {
        updateItemStatus(itemId, 'error', 0, 'Error al comprimir la imagen');
        return false;
      }

      // Get signed upload params from API
      updateItemStatus(itemId, 'uploading', 10);
      let uploadUrl: string;
      let storageKey: string;
      let signature: string;
      let timestamp: number;
      let apiKey: string;
      try {
        const uploadUrlResponse = await fetch('/api/photos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            guest_id: guestId,
            mime_type: compressed.mimeType,
            original_filename: file.name,
          }),
        });

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
      } catch (err) {
        updateItemStatus(itemId, 'error', 0, err instanceof Error ? err.message : 'Error de conexión');
        return false;
      }

      // Upload directly to Cloudinary
      updateItemStatus(itemId, 'uploading', 30);
      let secureUrl = storageKey; // fallback to storage_key if Cloudinary doesn't return URL
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

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Error al subir la foto: ${errorText}`);
        }

        // Parse Cloudinary response to get the secure_url
        const cloudinaryResult = await uploadResponse.json();
        if (cloudinaryResult.secure_url) {
          secureUrl = cloudinaryResult.secure_url;
        }
      } catch (err) {
        updateItemStatus(itemId, 'error', 0, err instanceof Error ? err.message : 'Error de red');
        return false;
      }

      updateItemStatus(itemId, 'uploading', 80);

      // Register photo in database
      try {
        const registerResponse = await fetch('/api/photos/upload', {
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
        });

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al registrar la foto');
        }
      } catch (err) {
        updateItemStatus(itemId, 'error', 0, err instanceof Error ? err.message : 'Error de registro');
        return false;
      }

      updateItemStatus(itemId, 'success', 100);
      return true;
    },
    [eventId, guestId, updateItemStatus]
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const newItems: PhotoUploadItem[] = files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
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

      for (let i = 0; i < files.length; i++) {
        const item = newItems[i];
        const success = await uploadSingleFile(files[i], item.id, item.previewUrl);

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
          progress: (doneCount / prev.total) * 100,
        }));
      }

      setState((prev) => ({
        ...prev,
        uploading: false,
        progress: 100,
        error: failed > 0 ? `${failed} foto(s) no se pudieron subir` : null,
      }));
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
    setItems([]);
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
