"use client";

import { cn } from "@/lib/cn";

export function Toggle({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-sm">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "tap-target relative inline-flex h-[28px] w-[48px] shrink-0 items-center rounded-full transition-colors duration-(--motion-fast) ease-standard disabled:opacity-60",
          checked ? "bg-accent-primary" : "bg-divider",
        )}
      >
        <span
          data-testid="toggle-knob"
          aria-hidden="true"
          className={cn(
            "inline-block size-[22px] translate-x-[3px] rounded-full bg-surface-raised transition-transform duration-(--motion-fast) ease-standard",
            checked && "translate-x-[23px]",
          )}
        />
      </button>
      <label htmlFor={id} className={cn("min-h-[24px] text-body", disabled && "opacity-60")}>
        {label}
      </label>
    </div>
  );
}
