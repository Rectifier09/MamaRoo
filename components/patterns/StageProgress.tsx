import { cn } from "@/lib/cn";

export function StageProgress({
  stage,
  totalStages,
  label,
}: {
  stage: number;
  totalStages: number;
  label: string;
}) {
  const current = Math.min(Math.max(stage, 0), totalStages);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={totalStages}
      className="flex items-center gap-xs"
    >
      {Array.from({ length: totalStages }, (_, i) => {
        const complete = i < current;
        return (
          <span
            key={i}
            data-testid="stage-marker"
            data-state={complete ? "complete" : "pending"}
            className={cn(
              "h-[6px] flex-1 rounded-full",
              complete ? "bg-accent-primary" : "bg-divider",
            )}
          />
        );
      })}
    </div>
  );
}
