'use client';

import { Photo } from '@/types/photo.types';
import { formatRelativeTime } from '@/utils/date-formatter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getPhotoUrlClient } from '@/lib/cloudinary/client-url';
import { useState, useRef, useCallback } from 'react';

interface GalleryItemProps {
  photo: Photo;
  isOwner: boolean;
  onClick: () => void;
  onDelete: () => void;
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

export default function GalleryItem({ photo, isOwner, onClick, onDelete }: GalleryItemProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  // Cloudinary delivers optimized thumbnails automatically
  const thumbnailUrl = getPhotoUrlClient(photo.storage_key, { width: 400, height: 400, crop: 'fill' });

  // Stagger animation class based on photo ID
  const staggerClass = `stagger-${(photo.id.charCodeAt(0) % 6) + 1}`;

  return (
    <div className={`break-inside-avoid relative group animate-fade-in-up ${staggerClass}`}>
      <div className="relative overflow-hidden rounded-xl bg-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
        {/* Skeleton placeholder with shimmer */}
        {!loaded && (
          <div className="absolute inset-0 animate-shimmer rounded-xl" />
        )}
        <img
          ref={imgRef}
          src={thumbnailUrl}
          alt={`Foto por ${photo.guest_display_name || 'Anónimo'}`}
          className={`w-full cursor-pointer transition-transform duration-500 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Ver foto de ${photo.guest_display_name || 'Anónimo'}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {/* Photo info overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5 ring-2 ring-white/30">
                <AvatarFallback className={`text-[10px] ${getAvatarColor(photo.guest_id || '')}`}>
                  {photo.guest_display_name ? getInitials(photo.guest_display_name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">
                  {photo.guest_display_name || 'Anónimo'}
                </p>
                <p className="text-white/70 text-[10px]">
                  {formatRelativeTime(photo.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Delete button for owner */}
        {isOwner && (
          <div className="absolute top-2 right-2">
            {deleteConfirm ? (
              <div className="flex gap-1 bg-white/90 backdrop-blur-sm rounded-full p-0.5 shadow-lg">
                <button
                  className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label="Confirmar eliminación"
                >
                  ✓
                </button>
                <button
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs hover:bg-slate-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(false);
                  }}
                  aria-label="Cancelar eliminación"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(true);
                }}
                className="bg-white/90 backdrop-blur-sm hover:bg-red-500 hover:text-white text-slate-500 rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                aria-label="Eliminar esta foto"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
