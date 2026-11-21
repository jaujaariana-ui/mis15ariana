'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DrawParticipant } from '@/types/draw.types';

interface DrawWinnerModalProps {
  winner: DrawParticipant | null;
  onClose?: () => void;
}

export default function DrawWinnerModal({ winner, onClose }: DrawWinnerModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  // Mostrar modal con animación cuando hay un ganador
  useEffect(() => {
    if (winner) {
      setIsVisible(true);
      setShowConfetti(true);
      const cleanup = startConfetti();
      cleanupRef.current = cleanup;

      // Ocultar confeti después de 8 segundos
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 8000);

      return () => {
        clearTimeout(timer);
        if (cleanup) cleanup();
      };
    }
  }, [winner]);

  const startConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }> = [];

    const colors = [
      '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF69B4', '#FFA500',
      '#00CED1', '#FF4500', '#7B68EE', '#32CD32', '#FF1493'
    ];

    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: Math.random() * 0.5 + 0.5,
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
          ctx.globalAlpha = p.opacity;
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
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleClose = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = undefined;
    }
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  if (!winner) return null;

  return (
    <>
      {/* Overlay de fondo */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Canvas de confeti */}
        {showConfetti && (
          <canvas
            ref={confettiCanvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ zIndex: 10001 }}
          />
        )}

        {/* Modal de ganador */}
        <div
          className={`relative z-50 w-full max-w-lg transform transition-all duration-500 ${
            isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fondo con imagen Midnight Gold Quinceañera */}
          <div className="relative rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden" style={{ backgroundImage: "url('/Midnight Gold Quinceañera Invitation.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
            {/* Overlay oscuro para legibilidad */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Contenido sobre la imagen */}
            <div className="relative">
              {/* Decoración superior */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400" />

            {/* Botón de cerrar */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-amber-700 hover:text-amber-900 transition-colors shadow-sm"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Contenido del modal */}
            <div className="p-8 text-center">
              {/* Emojis de celebración */}
              <div className="flex justify-center gap-2 mb-4">
                <span className="text-4xl animate-bounce" style={{ animationDelay: '0ms' }}>🎉</span>
                <span className="text-4xl animate-bounce" style={{ animationDelay: '150ms' }}>🏆</span>
                <span className="text-4xl animate-bounce" style={{ animationDelay: '300ms' }}>🎉</span>
              </div>

              {/* Título */}
              <h2 className="text-3xl md:text-4xl font-bold text-amber-800 mb-6 font-playfair tracking-wide">
                ¡TENEMOS UN GANADOR!
              </h2>

              {/* Esfera del ganador */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Anillo exterior brillante */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 animate-ping opacity-30" style={{ animationDuration: '2s' }} />
                  <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-2xl flex items-center justify-center ring-4 ring-amber-200 ring-offset-4 ring-offset-amber-50">
                    {/* Brillo interior */}
                    <div className="absolute top-3 left-4 w-8 h-4 bg-white/40 rounded-full blur-sm" />
                    <span className="text-white font-bold text-5xl md:text-6xl drop-shadow-lg">
                      {winner.display_name[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nombre del ganador */}
              <div className="mb-4">
                <p className="text-4xl md:text-5xl font-bold text-amber-900 mb-2 font-playfair tracking-tight">
                  {winner.display_name}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400" />
                  <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">
                    Ganador del sorteo
                  </span>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400" />
                </div>
              </div>

              {/* Mensaje de felicitación */}
              <div className="bg-white/60 rounded-2xl p-4 mb-6 border border-amber-200/50">
                <p className="text-xl text-amber-700 font-medium">
                  🎊 ¡Felicidades! 🎊
                </p>
              </div>

              {/* Botón de cerrar */}
              <button
                onClick={handleClose}
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                ¡Genial!
              </button>
            </div>

            {/* Decoración inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400" />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
