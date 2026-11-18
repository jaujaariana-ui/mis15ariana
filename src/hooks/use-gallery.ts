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

  const fetchPhotos = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!eventId || fetchRef.current) return;
    fetchRef.current = true;

    try {
      // Use public API to fetch photos (bypasses RLS issues on guest_profiles join)
      const url = `/api/events/${eventId}/photos/public?limit=${PAGE_SIZE}&offset=${pageNum * PAGE_SIZE}`;
      const resp = await fetch(url);

      if (resp.ok) {
        const { photos: data } = await resp.json();
        if (data) {
          if (append) {
            setPhotos((prev) => [...prev, ...data]);
          } else {
            setPhotos(data);
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
      return;
    }

    // Reset state when event changes
    setPhotos([]);
    setHasMore(false);
    setPage(0);
    fetchPhotos(0, false);
  }, [eventId, fetchPhotos]);

  // Realtime subscription for new photos
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
          setPhotos((prev) => {
            if (prev.find((p) => p.id === newPhoto.id)) return prev;
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
