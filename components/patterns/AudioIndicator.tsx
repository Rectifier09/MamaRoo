"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * The read-aloud control. Lives top-right of the container it decorates.
 * An icon alone is never a control — the label is required, not optional.
 */
export function AudioIndicator({
  playing,
  onPlay,
  label,
  className,
}: {
  playing: boolean;
  onPlay: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={playing}
      onClick={onPlay}
      className={cn(
        "tap-target absolute right-0 top-0 inline-flex items-center justify-center rounded-full bg-surface text-accent-primary shadow-1",
        className,
      )}
    >
      <Icon name={playing ? "Pause" : "SpeakerHigh"} label={label} />
    </button>
  );
}
