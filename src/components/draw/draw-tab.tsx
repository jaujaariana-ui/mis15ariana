'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDrawSession } from '@/hooks/use-draw-session';
import DrawCarousel from '@/components/draw/draw-carousel';
import DrawWinnerModal from '@/components/draw/draw-winner-modal';
import { DrawParticipant } from '@/types/draw.types';

interface DrawTabProps {
  eventId: string;
}

export default function DrawTab({ eventId }: DrawTabProps) {
  const {
    session,
    activeSession,
    participants,
    winners,
    loading,
    drawing,
    startDraw,
    finishDraw,
  } = useDrawSession(eventId);

  const [winner, setWinner] = useState<DrawParticipant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const lastProcessedWinnerRef = useRef<string | null>(null);

  // Cuando el sorteo termina, mostrar el modal del ganador
  useEffect(() => {
    if (session?.status === 'finished' && session.winner_participant_id && session.winner_display_name) {
      // Si ya procesamos este ganador, no hacer nada
      if (lastProcessedWinnerRef.current === session.winner_participant_id) {
        return;
      }

      // Marcar como procesado para evitar re-ejecuciones
      lastProcessedWinnerRef.current = session.winner_participant_id;

      // Intentar encontrar al ganador en la lista de participantes
      const winnerParticipant = participants.find(
        p => p.id === session.winner_participant_id
      );
      if (winnerParticipant) {
        setWinner(winnerParticipant);
        setShowModal(true);
      } else {
        // Si participants aún no está cargado, crear un objeto mínimo con los datos de la sesión
        setWinner({
          id: session.winner_participant_id,
          display_name: session.winner_display_name,
          photo_count: 0,
        });
        setShowModal(true);
      }
    }
  }, [session?.status, session?.winner_participant_id, session?.winner_display_name, participants]);

  // Cuando se resetean los ganadores (clear), cerrar el modal automáticamente
  useEffect(() => {
    if (winners.length === 0 && showModal) {
      setShowModal(false);
      setWinner(null);
    }
  }, [winners.length, showModal]);

  // Cuando empieza un nuevo sorteo (drawing = true), cerrar el modal del ganador anterior
  useEffect(() => {
    if (drawing) {
      setShowModal(false);
      setWinner(null);
      // Resetear el ref para permitir mostrar el modal del nuevo ganador
      lastProcessedWinnerRef.current = null;
    }
  }, [drawing]);

  // Cuando la sesión cambia de 'finished' a 'running' (nueva sesión), cerrar el modal
  useEffect(() => {
    if (session?.status === 'running') {
      setShowModal(false);
      setWinner(null);
      // Resetear el ref para permitir mostrar el modal del nuevo ganador
      lastProcessedWinnerRef.current = null;
    }
  }, [session?.status]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
  }, []);

  // Cuando la animación termina, finalizar el sorteo (solo admin)
  const handleFinishAnimation = useCallback(async () => {
    if (activeSession?.status === 'running') {
      try {
        await finishDraw();
      } catch (error) {
        console.error('Error finalizando sorteo:', error);
      }
    }
  }, [activeSession, finishDraw]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Carrusel de participantes */}
      <DrawCarousel
        participants={participants}
        isDrawing={drawing}
        winnerId={winner?.id || session?.winner_participant_id || null}
        onFinishAnimation={handleFinishAnimation}
      />

      {/* Modal del ganador - aparece en todos los dispositivos */}
      {showModal && winner && (
        <DrawWinnerModal
          winner={winner}
          onClose={handleModalClose}
        />
      )}

      {/* Overlay del carrusel - se muestra encima del modal cuando el sorteo está en curso */}
      {drawing && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ zIndex: 99999 }}
        >
          <div className="w-full max-w-2xl px-4">
            <div className="text-center mb-4">
              <p className="text-white text-xl font-bold animate-pulse">
                🎰 Sorteo en curso...
              </p>
            </div>
            <DrawCarousel
              participants={participants}
              isDrawing={true}
              winnerId={null}
            />
          </div>
        </div>
      )}

      {/* Sin participantes */}
      {participants.length === 0 && !loading && (
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>Los invitados deben subir al menos una foto para participar en el sorteo</p>
        </div>
      )}
    </div>
  );
}
