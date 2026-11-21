'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDrawSession } from '@/hooks/use-draw-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    resetDraw,
    fetchSession,
    playAudio,
    stopAudio,
  } = useDrawSession(eventId);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [winner, setWinner] = useState<DrawParticipant | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Actualizar ganador cuando la sesión cambia
  useEffect(() => {
    if (session?.status === 'finished' && session.winner_display_name) {
      const w = participants.find(p => p.id === session.winner_participant_id);
      if (w) setWinner(w);
    }
  }, [session, participants]);

  // Limpiar mensaje de éxito después de 3 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // "Iniciar Sorteo" - Primera vez, limpia todo el historial
  const handleStartDraw = useCallback(async () => {
    // Limpiar historial de ganadores antes del primer sorteo
    if (winners.length > 0) {
      try {
        await clearWinners();
      } catch (err) {
        console.error('Error al resetear ganadores:', err);
      }
    }
    setWinner(null);
    setError(null);
    setSuccess(null);

    // Reproducir audio dentro del gesto del usuario (requerido en móviles)
    playAudio();
    setStarting(true);

    try {
      const result = await startDraw(5000);
      if (result?.winner) {
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

  // "Realizar Nuevo Sorteo" - Acumula ganadores sin borrar el historial
  const handleNewDraw = useCallback(async () => {
    setWinner(null);
    setError(null);
    setSuccess(null);

    // Reproducir audio dentro del gesto del usuario (requerido en móviles)
    playAudio();
    setStarting(true);

    try {
      const result = await startDraw(5000);
      if (result?.winner) {
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
  }, [startDraw, playAudio]);

  const handleFinishDraw = useCallback(async () => {
    // Detener audio dentro del gesto del usuario
    stopAudio();
    try {
      await finishDraw();
      setSuccess('¡Ganador registrado en el historial!');
    } catch (err: any) {
      setError(err.message || 'Error al finalizar el sorteo');
    }
  }, [finishDraw, stopAudio]);

  // "Resetear" - Limpia todo y cierra diálogos en todos los dispositivos
  const handleReset = useCallback(async () => {
    setResetting(true);
    setError(null);
    setSuccess(null);
    try {
      await resetDraw();
      setWinner(null);
      setShowResetDialog(false);
      setSuccess('Sorteo reiniciado correctamente');
    } catch (err: any) {
      setError(err.message || 'Error al resetear el sorteo');
    } finally {
      setResetting(false);
    }
  }, [resetDraw]);

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
    <>
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
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-100 text-green-600 text-sm rounded-xl p-3 flex items-center justify-between">
            <span>✅ {success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600 ml-2">
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

        {/* Controles principales */}
        <div className="flex gap-3">
          {/* Botón "INICIAR SORTEO" - primera vez, sin historial */}
          {!activeSession && !session && (
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

          {/* Botón "REALIZAR NUEVO SORTEO" - acumula ganadores sin borrar */}
          {session?.status === 'finished' && participants.length > 0 && (
            <Button
              onClick={handleNewDraw}
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

          {/* Botón "DETENER" - aparece cuando hay un sorteo en curso */}
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
        </div>

        {/* Botón Resetear - solo cuando hay ganadores acumulados */}
        {winners.length > 0 && !activeSession && (
          <div className="flex gap-3">
            <Button
              onClick={() => setShowResetDialog(true)}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <span className="mr-2">🗑️</span>
              RESETEAR
            </Button>
          </div>
        )}

        {/* Sin participantes disponibles para nuevo sorteo */}
        {session?.status === 'finished' && participants.length === 0 && winners.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl p-4 text-center">
            <p className="font-medium">Todos los participantes han ganado</p>
            <p className="text-xs mt-1 text-amber-600">
              Presiona "Resetear" para reiniciar el sorteo desde cero
            </p>
          </div>
        )}

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

    {/* Diálogo de confirmación para Resetear */}
    <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <span className="text-xl">⚠️</span>
            ¿Resetear el sorteo?
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Esta acción eliminará todo el historial de ganadores ({winners.length}{' '}
            {winners.length === 1 ? 'ganador' : 'ganadores'}) y reiniciará el sorteo
            desde cero. Todos los dispositivos conectados cerrarán los diálogos abiertos.
            <br />
            <span className="font-medium text-red-600">Esta acción no se puede deshacer.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(false)}
            disabled={resetting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Reiniciando...
              </>
            ) : (
              <>
                <span className="mr-2">🗑️</span>
                Sí, Resetear
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
