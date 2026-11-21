'use client';

import { useEffect, useMemo, useRef } from 'react';
import { DrawParticipant } from '@/types/draw.types';

interface DrawCarouselProps {
  participants: DrawParticipant[];
  isDrawing: boolean;
  winnerId: string | null;
  animationDurationMs?: number;
  onFinishAnimation?: () => void;
}

// Ancho de cada tarjeta + gap (responsive)
const getCardWidth = () => {
  if (typeof window === 'undefined') return 140;
  const w = window.innerWidth;
  if (w < 640) return 120; // mobile
  if (w < 768) return 130; // tablet
  return 150; // desktop
};

export default function DrawCarousel({
  participants,
  isDrawing,
  winnerId,
  onFinishAnimation,
}: DrawCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const isDrawingRef = useRef(isDrawing);
  const offsetRef = useRef(0);
  const cardWidthRef = useRef(getCardWidth());
  const winnerIdRef = useRef(winnerId);
  const hasStoppedRef = useRef(false);

  // Mantener refs sincronizados
  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);
  useEffect(() => {
    winnerIdRef.current = winnerId;
  }, [winnerId]);

  // Actualizar cardWidth al redimensionar
  useEffect(() => {
    const handleResize = () => {
      cardWidthRef.current = getCardWidth();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Triplar los participantes para loop infinito sin saltos
  const extendedParticipants = useMemo(() => {
    if (participants.length === 0) return [];
    // Necesitamos al menos 3 copias para loop sin saltos
    const tripled = [...participants, ...participants, ...participants];
    return tripled;
  }, [participants]);

  const totalWidth = useMemo(() => {
    return extendedParticipants.length * cardWidthRef.current;
  }, [extendedParticipants.length]);

  // Animación del carrusel horizontal
  useEffect(() => {
    if (!isDrawing || participants.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      hasStoppedRef.current = false;
      return;
    }

    hasStoppedRef.current = false;
    let speed = 2; // velocidad inicial baja
    const maxSpeed = 15; // velocidad máxima
    const accelerationRate = 0.3; // tasa de aceleración

    const animate = () => {
      if (!isDrawingRef.current) {
        // El sorteo terminó - verificar si hay ganador
        const wId = winnerIdRef.current;
        if (wId && !hasStoppedRef.current) {
          hasStoppedRef.current = true;
          // Detener en el ganador con desaceleración
          decelerateToWinner(wId);
        }
        return;
      }

      // Acelerar hasta velocidad máxima
      if (speed < maxSpeed) {
        speed = Math.min(speed + accelerationRate, maxSpeed);
      }

      offsetRef.current -= speed;

      // Loop infinito: cuando pasamos un set completo, resetear offset
      const singleSetWidth = participants.length * cardWidthRef.current;
      if (offsetRef.current <= -singleSetWidth) {
        offsetRef.current += singleSetWidth;
      } else if (offsetRef.current > 0) {
        offsetRef.current -= singleSetWidth;
      }

      // Aplicar transformación directamente al DOM (sin React state)
      const track = trackRef.current;
      if (track) {
        // Centrar el carrusel: offset + centro de la viewport
        track.style.transform = `translateX(${offsetRef.current}px)`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const decelerateToWinner = (winnerId: string) => {
      const winnerIdx = participants.findIndex(p => p.id === winnerId);
      if (winnerIdx === -1) return;

      const cardW = cardWidthRef.current;
      const singleSetWidth = participants.length * cardW;

      // Calcular la posición donde el ganador está en el centro del contenedor visible
      // El contenedor tiene ancho de viewport; el centro está en viewportWidth / 2
      // La tarjeta del ganador debe estar centrada: offset = -(winnerIdx * cardW) + (viewportCenter - cardW/2)
      const containerEl = trackRef.current?.parentElement;
      const containerWidth = containerEl?.offsetWidth || window.innerWidth;
      const centerOffset = (containerWidth - cardW) / 2;

      // Usar la segunda copia (set central) para que haya espacio para desacelerar
      const targetOffset = -(winnerIdx * cardW) + centerOffset - singleSetWidth;

      // Desaceleración progresiva
      let currentSpeed = speed;
      const decelerate = () => {
        currentSpeed *= 0.95; // reducir velocidad 5% por frame

        if (currentSpeed < 0.5) {
          // Detener exactamente en el ganador
          offsetRef.current = targetOffset;
          const track = trackRef.current;
          if (track) {
            track.style.transform = `translateX(${offsetRef.current}px)`;
            track.style.transition = 'transform 0.3s ease-out';
          }
          if (onFinishAnimation) {
            onFinishAnimation();
          }
          return;
        }

        // Mover hacia el objetivo
        const diff = targetOffset - offsetRef.current;
        if (Math.abs(diff) < currentSpeed) {
          offsetRef.current = targetOffset;
        } else {
          offsetRef.current += Math.sign(diff) * currentSpeed;
        }

        const track = trackRef.current;
        if (track) {
          track.style.transform = `translateX(${offsetRef.current}px)`;
        }

        requestAnimationFrame(decelerate);
      };

      requestAnimationFrame(decelerate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      hasStoppedRef.current = false;
    };
  }, [participants, onFinishAnimation]);

  // Limpiar transición al desmontar
  useEffect(() => {
    return () => {
      const track = trackRef.current;
      if (track) {
        track.style.transition = '';
      }
    };
  }, []);

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <p className="text-slate-500 text-center text-sm">
          Aún no hay participantes registrados para el sorteo
        </p>
        <p className="text-slate-400 text-xs mt-1 text-center">
          Los invitados deben subir al menos una foto para participar
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col items-center py-4 md:py-8">
      {/* Indicador central - flecha en la parte superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-500 drop-shadow-lg" />
        <div className="w-1 h-4 bg-amber-500" />
      </div>

      {/* Línea vertical del indicador */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-amber-500 via-amber-400/50 to-transparent z-10 pointer-events-none" />

      {/* Contenedor del carrusel con máscara de fade en los extremos */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: '120px',
          maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
      >
        {/* Track que se desplaza horizontalmente */}
        <div
          ref={trackRef}
          className="flex items-center h-full will-change-transform"
          style={{
            width: `${totalWidth}px`,
          }}
        >
          {extendedParticipants.map((participant, index) => {
            const originalIndex = index % participants.length;
            const isWinner = winnerId === participant.id;

            return (
              <div
                key={`${participant.id}-${index}`}
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: `${cardWidthRef.current}px`,
                  height: '100%',
                }}
              >
                <div
                  className={`
                    relative w-[90%] h-[70%] rounded-xl flex flex-col items-center justify-center
                    transition-all duration-300
                    ${isWinner
                      ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-2xl shadow-amber-200/50 ring-4 ring-amber-400 scale-110'
                      : 'bg-gradient-to-br from-slate-100 to-slate-200 shadow-md border border-slate-200'
                    }
                  `}
                >
                  {/* Inicial del participante */}
                  <div
                    className={`
                      w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1
                      ${isWinner
                        ? 'bg-white/30'
                        : 'bg-gradient-to-br from-amber-400 to-yellow-500'
                      }
                    `}
                  >
                    <span
                      className={`
                        font-bold text-sm md:text-base
                        ${isWinner ? 'text-white' : 'text-white'}
                      `}
                    >
                      {participant.display_name[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Nombre del participante */}
                  <span
                    className={`
                      text-xs md:text-sm font-medium text-center px-1 line-clamp-1
                      ${isWinner ? 'text-white font-bold' : 'text-slate-700'}
                    `}
                  >
                    {participant.display_name.length > 12
                      ? participant.display_name.slice(0, 11) + '…'
                      : participant.display_name}
                  </span>

                  {/* Brillo decorativo para ganador */}
                  {isWinner && (
                    <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicador inferior */}
      {isDrawing && (
        <div className="mt-4 flex items-center gap-2 text-amber-600">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-medium">Sorteo en curso...</span>
        </div>
      )}

      {/* Indicador de ganador */}
      {winnerId && !isDrawing && (
        <div className="mt-4 flex items-center gap-2 text-amber-700">
          <span className="text-lg">🏆</span>
          <span className="text-sm font-semibold">Ganador seleccionado</span>
        </div>
      )}
    </div>
  );
}
