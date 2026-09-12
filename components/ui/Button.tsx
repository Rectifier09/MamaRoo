"use client";

import { forwardRef, useId, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Shown to assistive tech and as a hint, so a disabled button is never unexplained. */
  disabledReason?: string;
}

const BASE =
  "relative tap-target inline-flex items-center justify-center gap-sm rounded-sm px-lg py-sm " +
  "text-button font-body font-medium text-center " +
  "transition-[transform,background-color,opacity] duration-(--motion-fast) ease-standard " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary " +
  "disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-primary text-surface-raised active:scale-[0.98] active:brightness-[0.92] disabled:opacity-40",
  // Border stays accent-primary (a non-text UI component, held to the looser
  // 3:1 contrast requirement); the label text uses text-primary instead --
  // Design-updated.md's CTA coral is specified for button fills only, and as
  // small text on a light surface it falls short of the 4.5:1 text minimum.
  secondary:
    "bg-surface text-text-primary border-[1.5px] border-accent-primary active:scale-[0.98] disabled:opacity-40",
  tertiary:
    "bg-transparent text-text-primary underline-offset-4 hover:underline disabled:opacity-40",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, disabled, disabledReason, children, className, ...rest },
  ref,
) {
  // useId rather than a literal fallback: two unlabelled buttons on one screen
  // would otherwise both claim id="button-reason", and aria-describedby would
  // resolve to whichever came first.
  const fallbackId = useId();
  const descriptionId = disabledReason ? `${rest.id ?? fallbackId}-reason` : undefined;
  return (
    <>
      <button
        ref={ref}
        data-variant={variant}
        aria-busy={loading || undefined}
        aria-describedby={descriptionId}
        disabled={disabled || loading}
        className={cn(BASE, VARIANTS[variant], className)}
        {...rest}
      >
        <span className={loading ? "opacity-0" : undefined}>{children}</span>
        {loading && (
          <span
            data-testid="button-spinner"
            aria-hidden="true"
            className="absolute inline-block size-[1em] animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
      </button>
      {disabledReason && (
        <span id={descriptionId} className="sr-only">
          {disabledReason}
        </span>
      )}
    </>
  );
});
