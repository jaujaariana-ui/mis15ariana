'use client';

export default function LoadingSkeleton() {
  // Varying heights to simulate masonry layout
  const heights = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[2/3]', 'aspect-[3/4]', 'aspect-square', 'aspect-[4/5]'];

  return (
    <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`${heights[i % heights.length]} rounded-xl break-inside-avoid animate-shimmer`}
        />
      ))}
    </div>
  );
}
