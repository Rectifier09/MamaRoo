"use client";

import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export function Checkbox({
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
    <div className="flex items-start gap-sm">
      <span className="relative inline-flex tap-target items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="peer size-[24px] appearance-none rounded-sm border border-divider bg-surface checked:bg-accent-primary disabled:opacity-60"
        />
        {checked && (
          <Check
            data-testid="checkbox-mark"
            aria-hidden="true"
            className="pointer-events-none absolute size-[18px] text-surface-raised"
          />
        )}
      </span>
      <label htmlFor={id} className={cn("min-h-[24px] text-body", disabled && "opacity-60")}>
        {label}
      </label>
    </div>
  );
}
