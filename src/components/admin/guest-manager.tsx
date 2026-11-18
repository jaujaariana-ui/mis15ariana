'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GuestProfile } from '@/types/guest.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/utils/date-formatter';

interface GuestManagerProps {
  eventId: string;
}

export default function GuestManager({ eventId }: GuestManagerProps) {
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestPhotoCounts, setGuestPhotoCounts] = useState<Record<string, number>>({});
  const [blocking, setBlocking] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGuests(data);

        // Fetch photo counts for each guest
        const counts: Record<string, number> = {};
        for (const guest of data) {
          const { count } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('guest_id', guest.id)
            .is('deleted_at', null);
          counts[guest.id] = count || 0;
        }
        setGuestPhotoCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleToggleBlock = async (guestId: string, currentBlocked: boolean) => {
    setBlocking(guestId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('guest_profiles')
        .update({ is_blocked: !currentBlocked })
        .eq('id', guestId);

      if (error) throw error;

      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestId ? { ...g, is_blocked: !currentBlocked } : g
        )
      );
    } catch (error) {
      console.error('Error toggling block:', error);
      alert('Error al actualizar el estado del invitado');
    } finally {
      setBlocking(null);
    }
  };

  const avatarColors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/6" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invitados ({guests.length})</CardTitle>
          <div className="text-sm text-gray-500">
            {guests.filter(g => g.is_blocked).length} bloqueados
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {guests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aún no hay invitados en este evento
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  guest.is_blocked ? 'bg-red-50 border-red-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className={`text-white text-sm ${getAvatarColor(guest.display_name)}`}>
                      {guest.display_name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {guest.display_name}
                      </p>
                      {guest.is_blocked && (
                        <Badge variant="destructive" className="text-xs">
                          Bloqueado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>📷 {guestPhotoCounts[guest.id] || 0} fotos</span>
                      <span>📅 {formatRelativeTime(guest.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <Button
                    variant={guest.is_blocked ? 'outline' : 'destructive'}
                    size="sm"
                    onClick={() => handleToggleBlock(guest.id, guest.is_blocked)}
                    disabled={blocking === guest.id}
                    className={guest.is_blocked ? 'text-green-600 border-green-300 hover:bg-green-50' : ''}
                  >
                    {blocking === guest.id
                      ? '...'
                      : guest.is_blocked
                      ? '🔓 Desbloquear'
                      : '🚫 Bloquear'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
