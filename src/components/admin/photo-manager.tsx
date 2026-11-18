'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Photo } from '@/types/photo.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/utils/date-formatter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getPhotoUrlClient } from '@/lib/cloudinary/client-url';

interface PhotoManagerProps {
  eventId: string;
}

export default function PhotoManager({ eventId }: PhotoManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          guest_profiles!photos_guest_id_fkey(display_name)
        `)
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPhotos(data.map((photo) => ({
          ...photo,
          guest_display_name: photo.guest_profiles?.display_name || null,
        })) as Photo[]);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = async (photoId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta foto?')) return;
    setDeleting(photoId);
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } else {
        alert('Error al eliminar la foto');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error al eliminar la foto');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`¿Estás seguro de eliminar TODAS las ${photos.length} fotos? Esta acción no se puede deshacer.`)) return;
    setDeletingAll(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Use service role to delete all photos
        const responses = await Promise.allSettled(
          photos.map(async (photo) => {
            const response = await fetch(`/api/photos/${photo.id}`, {
              method: 'DELETE',
            });
            return response.ok;
          })
        );
        
        const successCount = responses.filter(r => r.status === 'fulfilled' && r.value).length;
        setPhotos([]);
        alert(`${successCount} de ${photos.length} fotos eliminadas`);
      }
    } catch (error) {
      console.error('Error deleting all photos:', error);
      alert('Error al eliminar las fotos');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/photos/download`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        alert(errorBody.error || 'Error al descargar las fotos');
        return;
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `xalt-moments-${eventId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      alert('Error al descargar las fotos');
    }
  };

  const guests = Array.from(new Set(photos.map(p => p.guest_display_name).filter(Boolean)));

  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch = searchTerm
      ? (photo.guest_display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesGuest = selectedGuest === 'all'
      ? true
      : photo.guest_display_name === selectedGuest;
    return matchesSearch && matchesGuest;
  });

  const avatarColors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500'];
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
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fotos del evento ({photos.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadZip}>📦 Descargar ZIP</Button>
            {photos.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                disabled={deletingAll}
              >
                {deletingAll ? 'Eliminando...' : '🗑 Eliminar todo'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={selectedGuest}
            onChange={(e) => setSelectedGuest(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="all">Todos los invitados</option>
            {guests.map((guest) => (
              <option key={guest} value={guest || ''}>{guest || 'Anónimo'}</option>
            ))}
          </select>
        </div>

        {/* Photo grid */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {photos.length === 0 ? 'No hay fotos en este evento' : 'No se encontraron fotos con esos filtros'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={getPhotoUrlClient(photo.storage_key, { width: 300, height: 300, crop: 'fill' })}
                  alt={`Foto por ${photo.guest_display_name || 'Anónimo'}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 mb-1">
                      <Avatar className="w-4 h-4">
                        <AvatarFallback className={`text-white text-[8px] ${getAvatarColor(photo.guest_display_name || '?')}`}>
                          {(photo.guest_display_name || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white text-xs truncate">
                        {photo.guest_display_name || 'Anónimo'}
                      </span>
                    </div>
                    <p className="text-white/70 text-[10px]">
                      {formatRelativeTime(photo.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    disabled={deleting === photo.id}
                    className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {deleting === photo.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredPhotos.length > 0 && (
          <p className="text-xs text-gray-500 mt-3">
            Mostrando {filteredPhotos.length} de {photos.length} fotos
          </p>
        )}
      </CardContent>
    </Card>
  );
}
