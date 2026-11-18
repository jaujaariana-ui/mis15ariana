'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Photo } from '@/types/photo.types';

export function useEventRealtime(eventId: string | null) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef<boolean>(false);

  const fetchPhotos = useCallback(async () => {
    if (!eventId || fetchRef.current) return;
    fetchRef.current = true;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          guest_profiles!photos_guest_id_fkey(display_name)
        `)
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPhotos(
          data.map((photo) => ({
            ...photo,
            guest_display_name: photo.guest_profiles?.display_name || null,
          })) as Photo[]
        );
      }
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    fetchPhotos();

    // Subscribe to realtime changes
    const supabase = createClient();
    const channel = supabase
      .channel(`photos:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          // Add new photo to the beginning of the list
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
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          // Handle soft delete (deleted_at set)
          const updated = payload.new as any;
          if (updated.deleted_at) {
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
  }, [eventId, fetchPhotos]);

  return { photos, loading };
}
