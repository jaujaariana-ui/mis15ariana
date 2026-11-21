'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DrawSession, DrawParticipant } from '@/types/draw.types';

export function useDrawSession(eventId: string | null) {
  const [session, setSession] = useState<DrawSession | null>(null);
  const [activeSession, setActiveSession] = useState<DrawSession | null>(null);
  const [participants, setParticipants] = useState<DrawParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const fetchRef = useRef(false);

  const fetchSession = useCallback(async () => {
    if (!eventId || fetchRef.current) return;
    fetchRef.current = true;

    try {
      const [sessionRes, participantsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/draw`),
        fetch(`/api/events/${eventId}/draw/participants`),
      ]);

      const sessionData = await sessionRes.json();
      const participantsData = await participantsRes.json();

      if (sessionData.session) {
        setSession(sessionData.session);
      }
      if (sessionData.activeSession) {
        setActiveSession(sessionData.activeSession);
      }
      if (participantsData.participants) {
        setParticipants(participantsData.participants);
      }
    } catch (error) {
      console.error('Error fetching draw session:', error);
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, [eventId]);

  const fetchParticipants = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/draw/participants`);
      const data = await res.json();
      if (data.participants) {
        setParticipants(data.participants);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setSession(null);
      setActiveSession(null);
      setParticipants([]);
      setLoading(false);
      return;
    }

    fetchSession();

    // Suscribirse a cambios en draw_sessions vía Supabase Realtime
    const supabase = createClient();
    const channel = supabase
      .channel(`draw:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draw_sessions',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newSession = payload.new as DrawSession | undefined;
          const oldSession = payload.old as DrawSession | undefined;

          if (payload.eventType === 'INSERT') {
            if (newSession) {
              setSession(newSession);
              if (newSession.status === 'running' || newSession.status === 'pending') {
                setActiveSession(newSession);
                setDrawing(true);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            if (newSession) {
              setSession((prev) => {
                if (prev?.id === newSession.id) return newSession;
                return prev;
              });
              setActiveSession((prev) => {
                if (prev?.id === newSession.id) return newSession;
                return prev;
              });

              // Si cambió a running, iniciar animación
              if (newSession.status === 'running' && oldSession?.status !== 'running') {
                setDrawing(true);
              }
              // Si cambió a finished, detener animación
              if (newSession.status === 'finished') {
                setDrawing(false);
                setActiveSession(null);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            if (oldSession) {
              setSession((prev) => (prev?.id === oldSession.id ? null : prev));
              setActiveSession((prev) => (prev?.id === oldSession.id ? null : prev));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchSession]);

  const startDraw = useCallback(async (animationDurationMs?: number) => {
    if (!eventId) return null;

    try {
      const res = await fetch(`/api/events/${eventId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animationDurationMs }),
      });

      const data = await res.json();

      if (res.ok && data.session) {
        setSession(data.session);
        setActiveSession(data.session);
        setDrawing(true);
        if (data.participants) {
          setParticipants(data.participants);
        }
        return data;
      } else {
        throw new Error(data.error || 'Error al iniciar el sorteo');
      }
    } catch (error) {
      console.error('Error starting draw:', error);
      throw error;
    }
  }, [eventId]);

  const finishDraw = useCallback(async () => {
    if (!eventId) return null;

    try {
      const res = await fetch(`/api/events/${eventId}/draw/finish`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.session) {
        setSession(data.session);
        setActiveSession(null);
        setDrawing(false);
        return data;
      } else {
        throw new Error(data.error || 'Error al finalizar el sorteo');
      }
    } catch (error) {
      console.error('Error finishing draw:', error);
      throw error;
    }
  }, [eventId]);

  return {
    session,
    activeSession,
    participants,
    loading,
    drawing,
    fetchSession,
    fetchParticipants,
    startDraw,
    finishDraw,
  };
}
