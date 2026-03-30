interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-[var(--border)]/70 ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-28" />
    </div>
  );
}

export function SectionCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <Skeleton className="h-6 w-40" />
      <div className="mt-5 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
