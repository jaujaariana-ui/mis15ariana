'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDrawSession } from '@/hooks/use-draw-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DrawParticipant, DrawWinner } from '@/types/draw.types';

interface DrawManagerProps {
  eventId: string;
}

export default function DrawManager({ eventId }: DrawManagerProps) {
  const {
    session,
    activeSession,
    participants,
    winners,
    loading,
    drawing,
    startDraw,
    finishDraw,
    clearWinners,
    fetchSession,
    playAudio,
    stopAudio,
  } = useDrawSession(eventId);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<DrawParticipant | null>(null);

  // Actualizar ganador cuando la sesión cambia
  useEffect(() => {
    if (session?.status === 'finished' && session.winner_display_name) {
      const w = participants.find(p => p.id === session.winner_participant_id);
      if (w) setWinner(w);
    }
  }, [session, participants]);

  const handleStartDraw = useCallback(async () => {
    // Limpiar historial de ganadores y diálogos antes de iniciar
    if (winners.length > 0) {
      try {
        await clearWinners();
      } catch (err) {
        console.error('Error al resetear ganadores:', err);
      }
    }
    setWinner(null);
    setError(null);

    // Reproducir audio dentro del gesto del usuario (requerido en móviles)
    playAudio();
    setStarting(true);

    try {
      const result = await startDraw(5000);
      if (result?.winner) {
        // El ganador ya está seleccionado en el backend
        const w = result.participants?.find(
          (p: DrawParticipant) => p.id === result.winner.id
        );
        if (w) setWinner(w);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el sorteo');
    } finally {
      setStarting(false);
    }
  }, [startDraw, clearWinners, playAudio, winners]);

  const handleFinishDraw = useCallback(async () => {
    // Detener audio dentro del gesto del usuario
    stopAudio();
    try {
      await finishDraw();
    } catch (err: any) {
      setError(err.message || 'Error al finalizar el sorteo');
    }
  }, [finishDraw, stopAudio]);

  const avatarColors = [
    'bg-purple-500', 'bg-blue-500', 'bg-green-500',
    'bg-yellow-500', 'bg-red-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500',
  ];

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-amber-400 rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            Sorteo
          </CardTitle>
          {activeSession?.status === 'running' && (
            <Badge variant="secondary" className="animate-pulse">
              En curso
            </Badge>
          )}
          {session?.status === 'finished' && (
            <Badge variant="default">
              Finalizado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{participants.length}</p>
            <p className="text-sm text-slate-500">Participantes elegibles</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {winners.length}
            </p>
            <p className="text-sm text-slate-500">Sorteos realizados</p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex gap-3">
          {session?.status === 'finished' && (
            <Button
              onClick={handleStartDraw}
              disabled={starting || participants.length === 0}
              className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
            >
              {starting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Iniciando...
                </>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  REALIZAR NUEVO SORTEO
                </>
              )}
            </Button>
          )}

          {activeSession?.status === 'running' && (
            <Button
              onClick={handleFinishDraw}
              variant="destructive"
              className="flex-1"
            >
              <span className="mr-2">⏹</span>
              DETENER
            </Button>
          )}

          {!activeSession && session?.status !== 'finished' && (
            <Button
              onClick={handleStartDraw}
              disabled={starting || participants.length === 0}
              className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
            >
              {starting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Iniciando...
                </>
              ) : (
                <>
                  <span className="mr-2">🎲</span>
                  INICIAR SORTEO
                </>
              )}
            </Button>
          )}
        </div>

        {/* Ganador */}
        {session?.status === 'finished' && winner && (
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 text-center border border-amber-100">
            <p className="text-sm text-amber-600 font-medium mb-3">🏆 Ganador</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="text-white text-lg bg-gradient-to-br from-amber-300 to-yellow-500">
                  {winner.display_name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="text-xl font-bold text-amber-900">{winner.display_name}</p>
            <p className="text-sm text-amber-600 mt-1">¡Felicidades!</p>
          </div>
        )}

        {/* Lista de participantes */}
        {participants.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Participantes ({participants.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    winner?.id === participant.id
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className={`text-white text-sm ${getAvatarColor(participant.display_name)}`}>
                      {participant.display_name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {participant.display_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      📷 {participant.photo_count} fotos
                    </p>
                  </div>
                  {winner?.id === participant.id && (
                    <Badge variant="default" className="text-xs">
                      🏆 Ganador
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sin participantes */}
        {participants.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Aún no hay participantes elegibles</p>
            <p className="text-xs mt-1">Los invitados deben subir al menos una foto</p>
          </div>
        )}

        {/* Sorteos Realizados - Historial de ganadores */}
        {winners.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              🏆 Sorteos Realizados ({winners.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {winners.map((win, index) => (
                <div
                  key={win.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="text-white text-sm bg-gradient-to-br from-amber-300 to-yellow-500">
                      {win.display_name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {win.display_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(win.won_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant="default" className="text-xs">
                    🏆 Ganador
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
