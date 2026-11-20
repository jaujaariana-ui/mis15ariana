'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Photo } from '@/types/photo.types';

const PAGE_SIZE = 30;

export function useGallery(eventId: string | null) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const fetchRef = useRef<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Track received photo IDs to prevent duplicates from realtime + refresh race conditions
  const receivedIdsRef = useRef<Set<string>>(new Set());
  // Caché guest_id -> display_name. Realtime solo entrega la fila de `photos`
  // (sin la relación con guest_profiles), así que resolvemos el nombre aparte.
  const guestNamesRef = useRef<Map<string, string>>(new Map());
  const pendingGuestIdsRef = useRef<Set<string>>(new Set());
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cacheGuestNames = useCallback((list: Photo[]) => {
    for (const photo of list) {
      if (photo.guest_id && photo.guest_display_name) {
        guestNamesRef.current.set(photo.guest_id, photo.guest_display_name);
      }
    }
  }, []);

  // Realtime no incluye el nombre del invitado: lo pedimos una sola vez por
  // guest_id (agrupado y con retardo) y rellenamos las fotos ya mostradas.
  const resolveMissingGuestNames = useCallback(() => {
    if (!eventId || resolveTimerRef.current) return;
    resolveTimerRef.current = setTimeout(async () => {
      resolveTimerRef.current = null;
      const ids = Array.from(pendingGuestIdsRef.current);
      pendingGuestIdsRef.current.clear();
      if (ids.length === 0) return;

      try {
        const resp = await fetch(`/api/events/${eventId}/guests/names?ids=${ids.join(',')}`);
        if (!resp.ok) return;
        const { guests } = await resp.json();
        const resolved = new Map<string, string>();
        for (const guest of (guests || []) as { id: string; display_name: string }[]) {
          if (guest?.id && guest?.display_name) {
            guestNamesRef.current.set(guest.id, guest.display_name);
            resolved.set(guest.id, guest.display_name);
          }
        }
        if (resolved.size === 0) return;
        setPhotos((prev) =>
          prev.map((photo) =>
            !photo.guest_display_name && resolved.has(photo.guest_id)
              ? { ...photo, guest_display_name: resolved.get(photo.guest_id)! }
              : photo
          )
        );
      } catch {
        // Es solo una mejora de presentación: si falla, se reintentará con la próxima subida.
      }
    }, 600);
  }, [eventId]);

  const fetchPhotos = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!eventId || fetchRef.current) return;
    fetchRef.current = true;

    try {
      // Use public API to fetch photos (bypasses RLS issues on guest_profiles join)
      // Use cache: no-store only on initial load; subsequent loads use CDN cache
      const url = `/api/events/${eventId}/photos/public?limit=${PAGE_SIZE}&offset=${pageNum * PAGE_SIZE}`;
      const resp = await fetch(url, {
        headers: {
          // Hint to the CDN that we want fresh data for the first page
          'Cache-Control': pageNum === 0 && !append ? 'no-cache' : 'default',
        },
      });

      if (resp.ok) {
        const { photos: data } = await resp.json();
        if (data) {
          cacheGuestNames(data);
          if (append) {
            setPhotos((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newPhotos = data.filter((p: Photo) => !existingIds.has(p.id));
              newPhotos.forEach((p: Photo) => receivedIdsRef.current.add(p.id));
              return [...prev, ...newPhotos];
            });
          } else {
            setPhotos(data);
            // Reset received IDs tracker on full refresh
            receivedIdsRef.current = new Set(data.map((p: Photo) => p.id));
          }
          setHasMore(data.length === PAGE_SIZE);
          setPage(pageNum);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, [eventId, cacheGuestNames]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPhotos(page + 1, true);
    }
  }, [page, loading, hasMore, fetchPhotos]);

  useEffect(() => {
    if (!eventId) {
      setPhotos([]);
      setLoading(false);
      setHasMore(false);
      setPage(0);
      receivedIdsRef.current = new Set();
      guestNamesRef.current = new Map();
      return;
    }

    // Reset state when event changes
    setPhotos([]);
    setHasMore(false);
    setPage(0);
    receivedIdsRef.current = new Set();
    guestNamesRef.current = new Map();
    fetchPhotos(0, false);
  }, [eventId, fetchPhotos]);

  // Realtime subscription for new photos — optimized for high concurrency
  useEffect(() => {
    if (!eventId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`gallery:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newPhoto = payload.new as any;
          // Prevent duplicates: skip if we already have this photo
          const photoId = newPhoto.id;
          if (receivedIdsRef.current.has(photoId)) return;
          receivedIdsRef.current.add(photoId);

          // El payload de Realtime no trae el nombre del invitado: se resuelve
          // desde la caché y, si aún no se conoce, se consulta en segundo plano.
          const guestDisplayName =
            guestNamesRef.current.get(newPhoto.guest_id) ||
            newPhoto.guest_profiles?.display_name ||
            null;
          if (guestDisplayName) {
            guestNamesRef.current.set(newPhoto.guest_id, guestDisplayName);
          } else if (newPhoto.guest_id) {
            pendingGuestIdsRef.current.add(newPhoto.guest_id);
            resolveMissingGuestNames();
          }

          setPhotos((prev) => {
            const photo: Photo = {
              ...newPhoto,
              guest_display_name: guestDisplayName,
            };
            return [photo, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photos',
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.event_id === eventId && updated.deleted_at) {
            receivedIdsRef.current.delete(updated.id);
            setPhotos((prev) => prev.filter((p) => p.id !== updated.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          receivedIdsRef.current.delete(deleted.id);
          setPhotos((prev) => prev.filter((p) => p.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, resolveMissingGuestNames]);

  // Cleanup observer and pending name resolution on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
      }
    };
  }, []);

  const refresh = useCallback(() => {
    fetchPhotos(0, false);
  }, [fetchPhotos]);

  return {
    photos,
    loading,
    hasMore,
    loadMore,
    setPhotos,
    refresh,
  };
}
