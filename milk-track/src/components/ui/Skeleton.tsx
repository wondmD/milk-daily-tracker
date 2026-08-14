'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-md bg-border ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-10 w-1/2 mb-4" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[20px] border border-border bg-surface overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
      <div className="bg-surface-secondary border-b border-border p-4">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4 hidden sm:block" />
          <Skeleton className="h-4 w-1/4 hidden sm:block" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 items-center">
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-24 hidden sm:block" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
