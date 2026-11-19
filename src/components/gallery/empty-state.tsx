'use client';

interface EmptyStateProps {
  guestJoined: boolean;
}

export default function EmptyState({ guestJoined }: EmptyStateProps) {
  return (
    <div className="text-center py-16 sm:py-24 animate-fade-in-up">
      {/* Decorative icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
        <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>

      {/* Message */}
      <h3 className="font-playfair text-xl sm:text-2xl font-semibold text-slate-700 mb-2">
        {guestJoined ? 'Sé el primero' : 'La galería está vacía'}
      </h3>
      <p className="text-sm sm:text-base text-slate-400 max-w-sm mx-auto leading-relaxed">
        {guestJoined
          ? 'Comparte el primer momento y deja que la historia comience'
          : 'Únete al evento para empezar a compartir recuerdos'}
      </p>

      {/* Decorative dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
