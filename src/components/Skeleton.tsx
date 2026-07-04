import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function SkeletonCard({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('card p-4 animate-pulse', className)}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export function SkeletonTable({ count = 3 }: SkeletonProps) {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-10 bg-slate-100 border-b border-slate-200" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-50 border-b border-slate-100" />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-slate-200 rounded"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
