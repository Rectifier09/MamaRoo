"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, hint, className, onChange, defaultValue, value, ...rest },
  ref,
) {
  const [filled, setFilled] = useState(Boolean(defaultValue ?? value));
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="text-body-sm text-text-secondary">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        data-filled={filled ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          setFilled(event.target.value.length > 0);
          onChange?.(event);
        }}
        className={cn(
          // min-h, never h: Devanagari runs 15 to 30% longer than Latin and must
          // not be clipped by a field sized for English.
          "min-h-[48px] w-full rounded-sm bg-surface px-md py-sm text-body",
          "border border-divider",
          "focus:border-2 focus:border-accent-primary focus:outline-none",
          error && "border-2 border-alert",
          "disabled:opacity-60",
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-caption text-alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-caption text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
});
