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
  }, [eventId]);

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
      return;
    }

    // Reset state when event changes
    setPhotos([]);
    setHasMore(false);
    setPage(0);
    receivedIdsRef.current = new Set();
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

          setPhotos((prev) => {
            const photo: Photo = {
              ...newPhoto,
              guest_display_name: newPhoto.guest_profiles?.display_name || null,
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
  }, [eventId]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
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
