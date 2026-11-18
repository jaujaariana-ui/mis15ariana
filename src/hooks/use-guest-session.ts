'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GuestProfile } from '@/types/guest.types';

export function useGuestSession(eventId: string | null) {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const initGuest = async () => {
      const supabase = createClient();

      // Check for existing session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check for existing guest profile using admin API
          try {
            const resp = await fetch(`/api/guest/profile?event_id=${eventId}`);
            if (resp.ok) {
              const data = await resp.json();
              if (data.profile) {
                setGuest(data.profile);
                setDisplayName(data.profile.display_name);
              }
            }
          } catch (e) {
            console.error('Error checking existing profile:', e);
          }
        }
      }

      setLoading(false);
    };

    initGuest();
  }, [eventId]);

  const createGuestProfile = async () => {
    if (!eventId || !displayName.trim()) return null;

    setError(null);

    try {
      const resp = await fetch('/api/guest/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          event_id: eventId,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al crear perfil');
      }

      const data = await resp.json();

      // Set the session in the client so the user is now authenticated
      if (data.session) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setGuest(data.profile);
      return data.profile;
    } catch (err: any) {
      console.error('createGuestProfile error:', err);
      setError(err.message || 'No se pudo crear el perfil. Intenta de nuevo.');
      return null;
    }
  };

  return {
    guest,
    displayName,
    setDisplayName,
    loading,
    error,
    setError,
    createGuestProfile,
  };
}
