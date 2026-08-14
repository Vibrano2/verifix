import React from 'react';

export function SkeletonLoader({ type = 'card', count = 3 }) {
  const items = Array.from({ length: count });

  if (type === 'card') {
    return (
      <div className="space-y-4">
        {items.map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full skeleton-shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded skeleton-shimmer" />
              </div>
            </div>
            <div className="h-3 w-full rounded skeleton-shimmer" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 w-20 rounded-full skeleton-shimmer" />
              <div className="h-6 w-24 rounded-full skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'metrics') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
            <div className="h-3 w-1/2 rounded skeleton-shimmer" />
            <div className="h-6 w-3/4 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <div key={i} className="h-14 w-full rounded-xl skeleton-shimmer" />
      ))}
    </div>
  );
}
