'use client';

import { useEffect, useState } from 'react';
import { GuestProfile } from '@/types/guest.types';

export function useGuestSession(eventId: string | null) {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const initGuest = async () => {
      // Check for existing guest profile via the API (uses guest token cookie)
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

      // The server sets the guest token as an HTTP-only cookie automatically
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
