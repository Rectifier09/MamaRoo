import { cn } from "@/lib/cn";

export function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn("flex flex-col gap-sm", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          data-testid="skeleton-line"
          className="h-[16px] w-full rounded-sm bg-divider/60 motion-safe:animate-pulse"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div data-testid="skeleton-card" className="rounded-md bg-surface p-md shadow-1">
      <Skeleton lines={3} />
    </div>
  );
}
