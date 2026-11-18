'use client';

interface EmptyStateProps {
  guestJoined: boolean;
}

export default function EmptyState({ guestJoined }: EmptyStateProps) {
  return (
    <div className="text-center py-16 sm:py-24">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">📷</span>
      </div>
      <p className="text-gray-500 text-lg font-medium">Aún no hay fotos</p>
      <p className="text-gray-400 text-sm mt-1">
        {guestJoined
          ? '¡Sé el primero en compartir un momento!'
          : 'Únete al evento para compartir fotos'}
      </p>
    </div>
  );
}
