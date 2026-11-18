'use client';

import { useEffect, useCallback, useState } from 'react';
import { Photo } from '@/types/photo.types';
import { formatRelativeTime } from '@/utils/date-formatter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getPhotoUrlClient } from '@/lib/cloudinary/client-url';

interface LightboxProps {
  photo: Photo | null;
  onClose: () => void;
  photos?: Photo[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

const avatarColors = [
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-red-100 text-red-700',
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (guestId: string) => {
  const index = guestId.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

export default function Lightbox({ photo, onClose, photos, currentIndex = 0, onNavigate }: LightboxProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!photo) return;
    try {
      const url = getPhotoUrlClient(photo.storage_key);
      const response = await fetch(url);
      if (!response.ok) return;
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = photo.original_filename || 'foto.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error al descargar:', err);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!photo) return;

    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && photos && photos.length > 1) {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
      onNavigate?.(prevIndex);
      setImageLoaded(false);
    } else if (e.key === 'ArrowRight' && photos && photos.length > 1) {
      e.preventDefault();
      const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
      onNavigate?.(nextIndex);
      setImageLoaded(false);
    }
  }, [photo, onClose, photos, currentIndex, onNavigate]);

  useEffect(() => {
    if (!photo) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [photo, handleKeyDown]);

  if (!photo) return null;

  const hasMultiple = photos && photos.length > 1;
  const fullSizeUrl = getPhotoUrlClient(photo.storage_key, { width: 1920 });

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Visor de fotos"
    >
      {/* Top bar with photo info */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className={getAvatarColor(photo.guest_id || '')}>
                {photo.guest_display_name ? getInitials(photo.guest_display_name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm">
                {photo.guest_display_name || 'Anónimo'}
              </p>
              <p className="text-white/60 text-xs">
                {formatRelativeTime(photo.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMultiple && (
              <span className="text-white/60 text-xs mr-2">
                {currentIndex + 1} / {photos.length}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30"
              onClick={handleDownload}
            >
              ⬇ Descargar
            </Button>
            <button
              className="text-white/80 hover:text-white p-2"
              onClick={onClose}
              aria-label="Cerrar visor"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3 bg-black/30 hover:bg-black/50 rounded-full transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
              onNavigate?.(prevIndex);
              setImageLoaded(false);
            }}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3 bg-black/30 hover:bg-black/50 rounded-full transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
              onNavigate?.(nextIndex);
              setImageLoaded(false);
            }}
            aria-label="Foto siguiente"
          >
            ›
          </button>
        </>
      )}

      {/* Image */}
      <div className="max-w-full max-h-full flex items-center justify-center p-16 sm:p-20" onClick={(e) => e.stopPropagation()}>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          src={fullSizeUrl}
          alt={`Foto por ${photo.guest_display_name || 'Anónimo'}`}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    </div>
  );
}
