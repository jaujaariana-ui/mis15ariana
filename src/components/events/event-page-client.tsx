'use client';

import { useState, useCallback } from 'react';
import { Event } from '@/types/event.types';
import { Photo } from '@/types/photo.types';
import { useGallery } from '@/hooks/use-gallery';
import { useGuestSession } from '@/hooks/use-guest-session';
import { useUpload } from '@/hooks/use-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CameraCapture } from '@/components/camera/camera-capture';
import { FileSelector } from '@/components/upload/file-selector';
import { UploadProgress } from '@/components/upload/upload-progress';
import EventHeader from '@/components/events/event-header';
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Event Header */}
      <EventHeader event={event} photoCount={photos.length} />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {/* Guest Entry */}
        {!guest && !guestLoading && (
          <Card className="mb-6 shadow-sm border-0 ring-1 ring-gray-100">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  🎉 Bienvenido al evento
                </h2>
                <p className="text-sm text-gray-600">
                  Ingresa tu nombre para compartir y ver fotos
                </p>
              </div>
              {guestError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center justify-between">
                  <span>{guestError}</span>
                  <button onClick={() => setGuestError(null)} className="text-red-400 hover:text-red-600 ml-2">
                    ✕
                  </button>
                </div>
              )}
              <div className="flex gap-2 max-w-sm mx-auto">
                <Input
                  placeholder="Tu nombre o apodo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !joinLoading && handleJoin()}
                  maxLength={30}
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={handleJoin} disabled={!displayName.trim() || joinLoading}>
                  {joinLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest Loading */}
        {guestLoading && (
          <Card className="mb-6 shadow-sm border-0 ring-1 ring-gray-100">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-purple-300 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Cargando...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consent Modal */}
        <ConsentModal open={showConsent} onAccept={handleConsent} />

        {/* Delete Error */}
        {deleteError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center justify-between">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600 ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Upload Actions */}
        {guest && !showConsent && (
          <div className="mb-6">
            <div className="flex gap-2">
              <Button className="flex-1" type="button" onClick={() => setCameraOpen(true)}>
                <span className="mr-2">📷</span>
                <span className="hidden sm:inline">Tomar foto</span>
                <span className="sm:hidden">Cámara</span>
              </Button>
              <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Tomar foto</DialogTitle>
                  </DialogHeader>
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onCancel={handleCameraCancel}
                  />
                </DialogContent>
              </Dialog>

              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setGalleryOpen(true)}
              >
                <span className="mr-2">📁</span>
                <span className="hidden sm:inline">Seleccionar fotos</span>
                <span className="sm:hidden">Galería</span>
              </Button>
              <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Seleccionar fotos</DialogTitle>
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{photos.length}</span> fotos compartidas
            </p>
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
      <footer className="border-t bg-white mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            Powered by Xalt Moments
          </p>
        </div>
      </footer>
    </div>
  );
}
