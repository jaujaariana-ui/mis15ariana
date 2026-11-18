'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingSkeleton() {
  // Varying heights to simulate masonry layout
  const heights = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[2/3]', 'aspect-[3/4]', 'aspect-square', 'aspect-[4/5]'];

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className={`${heights[i % heights.length]} rounded-lg break-inside-avoid`} />
      ))}
    </div>
  );
}
