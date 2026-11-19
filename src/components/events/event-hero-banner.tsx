'use client';

import { Event } from '@/types/event.types';
import { getPhotoUrlClient } from '@/lib/cloudinary/client-url';

interface EventHeroBannerProps {
  event: Event;
  photoCount?: number;
}

const eventQuotes = [
  'Cada fotografía guarda un recuerdo, cada momento cuenta una historia',
  'Los mejores momentos se viven una vez, pero se recuerdan para siempre',
  'Aquí nacen los recuerdos que durarán toda la vida',
];

function getQuoteForEvent(eventName: string) {
  const index = eventName.charCodeAt(0) % eventQuotes.length;
  return eventQuotes[index];
}

export default function EventHeroBanner({ event, photoCount }: EventHeroBannerProps) {
  const quote = getQuoteForEvent(event.name);
  const hasCover = !!event.cover_image;

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="relative overflow-hidden">
      {/* Background layer */}
      {hasCover ? (
        <>
          <div className="absolute inset-0">
            <img
              src={getPhotoUrlClient(event.cover_image!, { width: 1920, height: 800, crop: 'fill' })}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          </div>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
        </>
      ) : (
        <>
          {/* Elegant gradient background when no cover image */}
          <div className="absolute inset-0 event-hero-gradient" />
          <div className="absolute inset-0 floral-overlay" />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100/80 via-transparent to-slate-200/60" />
        </>
      )}

      {/* Content */}
      <div className={`relative ${hasCover ? 'py-16 sm:py-24 md:py-32' : 'py-12 sm:py-16 md:py-20'} px-4`}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Decorative line */}
          <div className={`flex items-center justify-center gap-3 mb-6 ${hasCover ? 'text-white/60' : 'text-slate-400'}`}>
            <div className="h-px w-12 bg-current" />
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <div className="h-px w-12 bg-current" />
          </div>

          {/* Event name */}
          <h1
            className={`font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 ${
              hasCover ? 'text-white' : 'text-slate-800'
            }`}
          >
            {event.name}
          </h1>

          {/* Date */}
          {formattedDate && (
            <p className={`text-sm sm:text-base font-medium mb-4 ${
              hasCover ? 'text-white/80' : 'text-slate-500'
            }`}>
              {formattedDate}
            </p>
          )}

          {/* Quote */}
          <p className={`text-sm sm:text-base italic max-w-xl mx-auto mb-6 ${
            hasCover ? 'text-white/70' : 'text-slate-400'
          }`}>
            "{quote}"
          </p>

          {/* Photo count badge */}
          {photoCount !== undefined && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              hasCover
                ? 'bg-white/15 backdrop-blur-sm text-white border border-white/20'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {photoCount} {photoCount === 1 ? 'fotografía' : 'fotografías'}
            </div>
          )}
        </div>
      </div>

      {/* Bottom wave separator */}
      <div className="relative">
        <svg
          className="w-full h-8 sm:h-12"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0L48 4.8C96 9.6 192 19.2 288 24C384 28.8 480 28.8 576 24C672 19.2 768 9.6 864 9.6C960 9.6 1056 19.2 1152 24C1248 28.8 1344 28.8 1392 28.8L1440 28.8V48H1392C1344 48 1248 48 1152 48C1056 48 960 48 864 48C768 48 672 48 576 48C480 48 384 48 288 48C192 48 96 48 48 48H0V0Z"
            fill={hasCover ? '#f8fafc' : '#ffffff'}
          />
        </svg>
      </div>
    </div>
  );
}
