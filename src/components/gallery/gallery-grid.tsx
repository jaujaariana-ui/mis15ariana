'use client';

import { useRef, useCallback } from 'react';
import { Photo } from '@/types/photo.types';
import GalleryItem from './gallery-item';

interface GalleryGridProps {
  photos: Photo[];
  guestId?: string;
  onPhotoClick: (photo: Photo) => void;
  onPhotoDelete: (photoId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function GalleryGrid({
  photos,
  guestId,
  onPhotoClick,
  onPhotoDelete,
  onLoadMore,
  hasMore,
}: GalleryGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const observe = useCallback(() => {
    if (!onLoadMore || !hasMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
  }, [onLoadMore, hasMore]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="columns-2 sm:columns-3 md:columns-4 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
        {photos.map((photo) => (
          <GalleryItem
            key={photo.id}
            photo={photo}
            isOwner={guestId === photo.guest_id}
            onClick={() => onPhotoClick(photo)}
            onDelete={() => onPhotoDelete(photo.id)}
          />
        ))}
      </div>
      {hasMore && onLoadMore && (
        <div
          ref={(el) => {
            loadMoreRef.current = el;
            if (el) observe();
          }}
          className="py-8 text-center"
        >
          <div className="inline-block w-6 h-6 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
