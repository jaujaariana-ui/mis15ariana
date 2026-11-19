'use client';

import { useEffect, useCallback, useState } from 'react';
import { Photo } from '@/types/photo.types';
import { formatRelativeTime } from '@/utils/date-formatter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getPhotoUrlClient } from '@/lib/cloudinary/client-url';

interface LightboxProps {
  photo: Photo | null;
  onClose: () => void;
  photos?: Photo[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

const avatarColors = [
  'bg-slate-100 text-slate-700',
  'bg-blue-50 text-blue-700',
  'bg-rose-50 text-rose-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-violet-50 text-violet-700',
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
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Visor de fotos"
    >
      {/* Top bar with photo info */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3 sm:p-4 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 ring-2 ring-white/20">
              <AvatarFallback className={`text-xs ${getAvatarColor(photo.guest_id || '')}`}>
                {photo.guest_display_name ? getInitials(photo.guest_display_name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm">
                {photo.guest_display_name || 'Anónimo'}
              </p>
              <p className="text-white/50 text-xs">
                {formatRelativeTime(photo.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMultiple && (
              <span className="hidden sm:inline text-white/50 text-xs mr-2 font-mono">
                {currentIndex + 1} / {photos.length}
              </span>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors backdrop-blur-sm"
              aria-label="Descargar foto"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden sm:inline">Descargar</span>
            </button>
            <button
              className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={onClose}
              aria-label="Cerrar visor"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <button
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 sm:p-3 bg-black/20 hover:bg-black/40 rounded-full transition-all z-10"
            onClick={(e) => {
              e.stopPropagation();
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
              onNavigate?.(prevIndex);
              setImageLoaded(false);
            }}
            aria-label="Foto anterior"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 sm:p-3 bg-black/20 hover:bg-black/40 rounded-full transition-all z-10"
            onClick={(e) => {
              e.stopPropagation();
              const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
              onNavigate?.(nextIndex);
              setImageLoaded(false);
            }}
            aria-label="Foto siguiente"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Image */}
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={fullSizeUrl}
          alt={`Foto por ${photo.guest_display_name || 'Anónimo'}`}
          className={`max-w-full max-h-full object-contain transition-opacity duration-500 rounded-sm ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Bottom indicator dots for mobile */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:hidden z-10">
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
            {photos.slice(Math.max(0, currentIndex - 1), currentIndex + 2).map((_, i) => {
              const dotIndex = Math.max(0, currentIndex - 1) + i;
              return (
                <div
                  key={dotIndex}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    dotIndex === currentIndex ? 'bg-white w-4' : 'bg-white/40'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
