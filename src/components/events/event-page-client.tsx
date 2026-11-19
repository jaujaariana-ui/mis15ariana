'use client';

import { useState, useCallback } from 'react';
import { Event } from '@/types/event.types';
import { Photo } from '@/types/photo.types';
import { useGallery } from '@/hooks/use-gallery';
import { useGuestSession } from '@/hooks/use-guest-session';
import { useUpload } from '@/hooks/use-upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FullscreenDialog, FullscreenDialogContent } from '@/components/ui/fullscreen-dialog';
import { CameraCapture } from '@/components/camera/camera-capture';
import { FileSelector } from '@/components/upload/file-selector';
import { UploadProgress } from '@/components/upload/upload-progress';
import EventHeroBanner from '@/components/events/event-hero-banner';
import GuestEntry from '@/components/events/guest-entry';
import GalleryGrid from '@/components/gallery/gallery-grid';
import Lightbox from '@/components/gallery/lightbox';
import EmptyState from '@/components/gallery/empty-state';
import LoadingSkeleton from '@/components/shared/loading-skeleton';
import ConsentModal from '@/components/shared/consent-modal';
import OfflineBanner from '@/components/shared/offline-banner';

interface Props {
  event: Event;
}

export default function EventPageClient({ event }: Props) {
  const { photos, loading, hasMore, loadMore, setPhotos, refresh } = useGallery(event.id);
  const { guest, displayName, setDisplayName, loading: guestLoading, createGuestProfile, error: guestError, setError: setGuestError } = useGuestSession(event.id);
  const { items: uploadItems, uploadFiles, retryUpload, clearItems } = useUpload(event.id, guest?.id || '');
  const [showConsent, setShowConsent] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!displayName.trim()) return;
    setJoinLoading(true);
    setGuestError(null);
    const profile = await createGuestProfile();
    setJoinLoading(false);
    if (profile) {
      setShowConsent(true);
    }
    // If profile is null and guestError is set, the error will be displayed
  };

  const handleConsent = () => {
    setShowConsent(false);
  };

  const handleCameraCapture = useCallback(async (blob: Blob) => {
    setCameraOpen(false);
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await uploadFiles([file]);
  }, [uploadFiles]);

  const handleCameraCancel = useCallback(() => {
    setCameraOpen(false);
  }, []);

  const handleFileSelect = useCallback(async (files: File[]) => {
    setGalleryOpen(false);
    await uploadFiles(files);
  }, [uploadFiles]);

  const handleGalleryCancel = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  const handleUploadComplete = useCallback(() => {
    clearItems();
  }, [clearItems]);

  const handleDeletePhoto = async (photoId: string) => {
    if (!guest) return;
    setDeleteError(null);
    
    // Optimistically remove the photo immediately
    const photoToRemove = photos.find((p) => p.id === photoId);
    if (photoToRemove) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
    
    const response = await fetch(`/api/photos/${photoId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (!response.ok) {
      // Revert optimistic update on failure
      if (photoToRemove) {
        setPhotos((prev) => [photoToRemove, ...prev]);
      }
      const errorData = await response.json().catch(() => ({}));
      setDeleteError(errorData.error || 'No puedes eliminar esta foto');
      return;
    }
    // Refresh in background to ensure sync (no visual impact since photo is already removed)
    refresh();
  };

  const handlePhotoClick = useCallback((photo: Photo) => {
    const index = photos.findIndex((p) => p.id === photo.id);
    if (index >= 0) {
      setLightboxIndex(index);
    }
  }, [photos]);

  const handleLightboxNavigate = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const handleLightboxClose = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const currentLightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] || null : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Banner */}
      <EventHeroBanner event={event} photoCount={photos.length} />

      <main className="max-w-6xl mx-auto px-4 -mt-2 pb-8">
        {/* Guest Entry */}
        {!guest && !guestLoading && (
          <GuestEntry
            displayName={displayName}
            setDisplayName={setDisplayName}
            onJoin={handleJoin}
            loading={joinLoading}
            error={guestError}
            setError={setGuestError}
          />
        )}

        {/* Guest Loading */}
        {guestLoading && (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400 mt-3">Cargando tu perfil...</p>
            </div>
          </div>
        )}

        {/* Consent Modal */}
        <ConsentModal open={showConsent} onAccept={handleConsent} />

        {/* Delete Error */}
        {deleteError && (
          <div className="mb-4 bg-red-50/80 border border-red-100 text-red-600 text-sm rounded-xl p-3 flex items-center justify-between animate-fade-in-up">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Upload Actions */}
        {guest && !showConsent && (
          <div className="mb-6">
            <div className="flex gap-2">
              <button
                type="button"
                className="premium-btn flex-1 flex items-center justify-center gap-2 py-3 text-sm"
                onClick={() => setCameraOpen(true)}
                disabled={cameraOpen}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="hidden sm:inline">Tomar foto</span>
                <span className="sm:hidden">Cámara</span>
              </button>
              <FullscreenDialog open={cameraOpen} onOpenChange={setCameraOpen}>
                <FullscreenDialogContent>
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onCancel={handleCameraCancel}
                  />
                </FullscreenDialogContent>
              </FullscreenDialog>

              <button
                className="premium-btn-secondary flex-1 flex items-center justify-center gap-2 py-3 text-sm"
                onClick={() => setGalleryOpen(true)}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className="hidden sm:inline">Seleccionar fotos</span>
                <span className="sm:hidden">Galería</span>
              </button>
              <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
                <DialogContent className="max-w-sm rounded-2xl border-0 bg-white/95 backdrop-blur-xl shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-playfair text-lg text-center">Seleccionar fotos</DialogTitle>
                  </DialogHeader>
                  <FileSelector
                    onSelect={handleFileSelect}
                    onCancel={handleGalleryCancel}
                    maxFiles={event.max_photos_per_guest || 10}
                    maxSizeMB={event.max_file_size_mb || 10}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadItems.length > 0 && (
          <UploadProgress
            items={uploadItems}
            onRetry={retryUpload}
            onComplete={handleUploadComplete}
          />
        )}

        {/* Gallery Stats */}
        {guest && photos.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">{photos.length}</span> {photos.length === 1 ? 'fotografía' : 'fotografías'} compartidas
              </p>
            </div>
          </div>
        )}

        {/* Gallery */}
        {loading ? (
          <LoadingSkeleton />
        ) : photos.length === 0 ? (
          <EmptyState guestJoined={!!guest} />
        ) : (
          <GalleryGrid
            photos={photos}
            guestId={guest?.id}
            onPhotoClick={handlePhotoClick}
            onPhotoDelete={handleDeletePhoto}
            onLoadMore={loadMore}
            hasMore={hasMore}
          />
        )}
      </main>

      {/* Lightbox with navigation */}
      <Lightbox
        photo={currentLightboxPhoto}
        onClose={handleLightboxClose}
        photos={photos}
        currentIndex={lightboxIndex ?? 0}
        onNavigate={handleLightboxNavigate}
      />

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white/50 backdrop-blur-sm mt-8">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-8 bg-slate-200" />
            <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <div className="h-px w-8 bg-slate-200" />
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Xalt Moments
          </p>
        </div>
      </footer>
    </div>
  );
}
