'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { DrawParticipant } from '@/types/draw.types';

interface DrawCarouselProps {
  participants: DrawParticipant[];
  isDrawing: boolean;
  winnerId: string | null;
  animationDurationMs?: number;
  onFinishAnimation?: () => void;
}

const SPHERE_COLORS = [
  'from-amber-300 to-yellow-500',
  'from-rose-300 to-pink-500',
  'from-sky-300 to-blue-500',
  'from-emerald-300 to-green-500',
  'from-violet-300 to-purple-500',
  'from-orange-300 to-red-500',
  'from-teal-300 to-cyan-500',
  'from-fuchsia-300 to-pink-500',
  'from-lime-300 to-green-500',
  'from-indigo-300 to-blue-500',
];

export default function DrawCarousel({
  participants,
  isDrawing,
  winnerId,
  animationDurationMs = 5000,
  onFinishAnimation,
}: DrawCarouselProps) {
  const [rotation, setRotation] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // Asignar colores a cada participante
  const participantColors = useMemo(() => {
    return participants.map((_, i) => SPHERE_COLORS[i % SPHERE_COLORS.length]);
  }, [participants]);

  // Calcular posiciones en el carrusel 3D
  const spherePositions = useMemo(() => {
    if (participants.length === 0) return [];

    const count = participants.length;
    const radius = Math.min(120, count * 18);
    const positions = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: Math.sin(angle) * radius * 0.3,
        angle,
      });
    }
    return positions;
  }, [participants]);

  // Animación del carrusel
  useEffect(() => {
    if (!isDrawing || participants.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    startTimeRef.current = performance.now();
    let lastHighlighted = -1;

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / animationDurationMs, 1);

      // Easing: desacelerar al final
      const eased = 1 - Math.pow(1 - progress, 3);

      // Rotación: más rápido al inicio, más lento al final
      const speed = isDrawing ? (1 - eased) * 10 + 0.5 : 0;
      const newRotation = rotation + speed;

      setRotation(newRotation);

      // Calcular qué esfera está en el frente
      const normalizedRotation = ((newRotation % 360) + 360) % 360;
      const degreesPerSphere = 360 / participants.length;
      const currentHighlight = Math.floor(
        (normalizedRotation + degreesPerSphere / 2) / degreesPerSphere
      ) % participants.length;

      if (currentHighlight !== lastHighlighted) {
        setHighlightedIndex(currentHighlight);
        lastHighlighted = currentHighlight;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animación completada
        if (onFinishAnimation) {
          onFinishAnimation();
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDrawing, participants.length, animationDurationMs, onFinishAnimation]);

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
    <div className="relative w-full flex flex-col items-center py-8">
      {/* Carrusel 3D */}
      <div
        className="relative w-full"
        style={{
          height: 200,
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotation}deg)`,
            transition: isDrawing ? 'none' : 'transform 0.5s ease-out',
          }}
        >
          {participants.map((participant, index) => {
            const pos = spherePositions[index];
            const isWinner = winnerId === participant.id;
            const isHighlighted = highlightedIndex === index;

            // Calcular escala y opacidad basada en la posición Z
            const scale = 0.7 + (pos.z + 50) / 200;
            const opacity = 0.5 + (pos.z + 50) / 200;

            return (
              <div
                key={participant.id}
                className={`absolute transition-all duration-300 ${
                  isWinner ? 'z-50' : 'z-10'
                }`}
                style={{
                  transform: `
                    translateX(${pos.x}px)
                    translateY(${pos.y * 0.5}px)
                    translateZ(${pos.z}px)
                    scale(${isWinner ? 1.3 : scale})
                  `,
                  opacity: isWinner ? 1 : opacity,
                }}
              >
                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    bg-gradient-to-br ${participantColors[index]}
                    shadow-lg
                    ${isWinner ? 'ring-4 ring-amber-400 shadow-amber-200 shadow-xl' : ''}
                    ${isHighlighted && !isWinner ? 'ring-2 ring-white/50' : ''}
                    transition-all duration-300
                  `}
                >
                  <span className="text-white font-semibold text-xs text-center px-1 line-clamp-1">
                    {participant.display_name.length > 8
                      ? participant.display_name.slice(0, 7) + '…'
                      : participant.display_name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicador de rotación */}
      {isDrawing && (
        <div className="mt-6 flex items-center gap-2 text-amber-600">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-medium">Sorteo en curso...</span>
        </div>
      )}
    </div>
  );
}
