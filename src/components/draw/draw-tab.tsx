'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDrawSession } from '@/hooks/use-draw-session';
import DrawCarousel from '@/components/draw/draw-carousel';
import { DrawParticipant } from '@/types/draw.types';

interface DrawTabProps {
  eventId: string;
}

export default function DrawTab({ eventId }: DrawTabProps) {
  const {
    session,
    activeSession,
    participants,
    loading,
    drawing,
    startDraw,
    finishDraw,
  } = useDrawSession(eventId);

  const [showConfetti, setShowConfetti] = useState(false);
  const [winner, setWinner] = useState<DrawParticipant | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  // Cuando el sorteo termina, mostrar el ganador
  useEffect(() => {
    if (session?.status === 'finished' && session.winner_display_name) {
      const winnerParticipant = participants.find(
        p => p.id === session.winner_participant_id
      );
      if (winnerParticipant) {
        setWinner(winnerParticipant);
        setShowConfetti(true);
        startConfetti();

        // Ocultar confeti después de 5 segundos
        const timer = setTimeout(() => {
          setShowConfetti(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [session?.status, session?.winner_participant_id, participants]);

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

  // Confeti simple con canvas
  const startConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let active = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 50) {
          active = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      if (active) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Canvas de confeti */}
      {showConfetti && (
        <canvas
          ref={confettiCanvasRef}
          className="fixed inset-0 pointer-events-none z-50"
          style={{ zIndex: 9999 }}
        />
      )}

      {/* Carrusel de participantes */}
      <DrawCarousel
        participants={participants}
        isDrawing={drawing}
        winnerId={winner?.id || session?.winner_participant_id || null}
        onFinishAnimation={handleFinishAnimation}
      />

      {/* Celebración del ganador */}
      {session?.status === 'finished' && winner && (
        <div className="mt-8 text-center animate-fade-in-up">
          <div className="inline-block bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-8 shadow-lg border border-amber-100">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-amber-800 mb-2 font-playfair">
              ¡TENEMOS UN GANADOR!
            </h3>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center
                bg-gradient-to-br from-amber-300 to-yellow-500
                shadow-lg ring-4 ring-amber-200
              `}>
                <span className="text-white font-bold text-lg">
                  {winner.display_name[0].toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-900 mb-2 font-playfair">
              {winner.display_name}
            </p>
            <p className="text-amber-600 text-sm font-medium">
              ¡Felicidades!
            </p>
          </div>
        </div>
      )}

      {/* Sorteo en curso */}
      {activeSession?.status === 'running' && session?.status !== 'finished' && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-medium text-amber-700">
              Sorteo en curso...
            </span>
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
