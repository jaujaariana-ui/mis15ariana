'use client';

import { Event } from '@/types/event.types';
import { Badge } from '@/components/ui/badge';

interface EventHeaderProps {
  event: Event;
  photoCount?: number;
}

export default function EventHeader({ event, photoCount }: EventHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {event.name}
            </h1>
            {event.event_date && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {event.event_date}
              </p>
            )}
          </div>
          {photoCount !== undefined && (
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="secondary" className="text-xs">
                📸 {photoCount} fotos
              </Badge>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
