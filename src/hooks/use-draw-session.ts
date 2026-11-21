'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DrawSession, DrawParticipant, DrawWinner } from '@/types/draw.types';

export function useDrawSession(eventId: string | null) {
  const [session, setSession] = useState<DrawSession | null>(null);
  const [activeSession, setActiveSession] = useState<DrawSession | null>(null);
  const [participants, setParticipants] = useState<DrawParticipant[]>([]);
  const [winners, setWinners] = useState<DrawWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const fetchRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const fetchWinners = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/draw/winners`);
      const data = await res.json();
      if (data.winners) {
        // Eliminar duplicados basados en participant_id para evitar ganadores repetidos
        const uniqueWinners = data.winners.filter(
          (w: DrawWinner, index: number, self: DrawWinner[]) =>
            index === self.findIndex((other: DrawWinner) => other.participant_id === w.participant_id)
        );
        setWinners(uniqueWinners);
      }
    } catch (error) {
      console.error('Error fetching winners:', error);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setSession(null);
      setActiveSession(null);
      setParticipants([]);
      setWinners([]);
      setLoading(false);
      return;
    }

    fetchSession();
    fetchWinners();

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
              // Si cambió a cancelled (reset), limpiar estado
              if (newSession.status === 'cancelled') {
                setDrawing(false);
                setActiveSession(null);
                stopAudio();
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

    // Suscribirse a cambios en draw_winners vía Supabase Realtime
    const winnersChannel = supabase
      .channel(`winners:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draw_winners',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newWinner = payload.new as DrawWinner;
            setWinners((prev) => {
              // Evitar duplicados: si ya existe el mismo id o el mismo participant_id, no agregar
              const exists = prev.some(
                w => w.id === newWinner.id || w.participant_id === newWinner.participant_id
              );
              if (exists) return prev;
              return [newWinner, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setWinners((prev) => prev.filter(w => w.id !== payload.old?.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(winnersChannel);
    };
  }, [eventId, fetchSession, fetchWinners]);

  // Inicializar el elemento de audio una sola vez
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/musicajuego.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Función para reproducir el audio — debe llamarse desde un gesto del usuario (click/touch)
  const playAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/musicajuego.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.warn('Error al reproducir el sonido del juego:', err);
    });
  }, []);

  // Función para detener el audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Fallback: intentar reproducir si drawing cambia (funciona en desktop)
  useEffect(() => {
    if (drawing) {
      playAudio();
    } else {
      stopAudio();
    }
    return () => {
      stopAudio();
    };
  }, [drawing, playAudio, stopAudio]);

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
        // Refrescar la lista de ganadores después de finalizar
        fetchWinners();
        return data;
      } else {
        throw new Error(data.error || 'Error al finalizar el sorteo');
      }
    } catch (error) {
      console.error('Error finishing draw:', error);
      throw error;
    }
  }, [eventId, fetchWinners]);

  const clearWinners = useCallback(async () => {
    if (!eventId) return;

    try {
      const res = await fetch(`/api/events/${eventId}/draw/winners`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setWinners([]);
        // Refrescar los participantes para incluir a los que ya habían ganado
        fetchParticipants();
        return data;
      } else {
        throw new Error(data.error || 'Error al resetear el historial');
      }
    } catch (error) {
      console.error('Error clearing winners:', error);
      throw error;
    }
  }, [eventId, fetchWinners, fetchParticipants]);

  const resetDraw = useCallback(async () => {
    if (!eventId) return;

    try {
      const res = await fetch(`/api/events/${eventId}/draw/reset`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        // Limpiar todo el estado local
        setWinners([]);
        setSession(null);
        setActiveSession(null);
        setDrawing(false);
        stopAudio();
        // Refrescar participantes y sesión
        fetchParticipants();
        fetchSession();
        return data;
      } else {
        throw new Error(data.error || 'Error al resetear el sorteo');
      }
    } catch (error) {
      console.error('Error resetting draw:', error);
      throw error;
    }
  }, [eventId, fetchWinners, fetchParticipants, fetchSession, stopAudio]);

  return {
    session,
    activeSession,
    participants,
    winners,
    loading,
    drawing,
    fetchSession,
    fetchParticipants,
    fetchWinners,
    startDraw,
    finishDraw,
    clearWinners,
    resetDraw,
    playAudio,
    stopAudio,
  };
}
