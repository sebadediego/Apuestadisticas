// src/components/LoadingSkeleton.tsx
export function MatchCardSkeleton() {
  return (
    <div className="glass-card-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="skeleton w-4 h-4 rounded" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton h-6 w-14" />
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton w-8 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="skeleton h-5 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-full mx-4" />
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
