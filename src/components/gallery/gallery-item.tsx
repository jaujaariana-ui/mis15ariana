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

  return (
    <div className="break-inside-avoid relative group">
      <div className="relative overflow-hidden rounded-lg bg-gray-200">
        {/* Skeleton placeholder */}
        {!loaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <img
          ref={imgRef}
          src={thumbnailUrl}
          alt={`Foto por ${photo.guest_display_name || 'Anónimo'}`}
          className={`w-full cursor-pointer transition-all duration-300 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDuration: '200ms' }}
          onClick={onClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Ver foto de ${photo.guest_display_name || 'Anónimo'}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {/* Photo info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
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
        {/* Delete button for owner */}
        {isOwner && (
          <div className="absolute top-2 right-2">
            {deleteConfirm ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  ✓
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 rounded-full bg-white/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(false);
                  }}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(true);
                }}
                className="bg-white/90 hover:bg-red-500 hover:text-white text-gray-600 rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                aria-label="Eliminar esta foto"
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
