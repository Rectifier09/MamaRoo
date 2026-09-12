"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const BASE = "block w-full text-left bg-surface rounded-md p-md shadow-1";

export function Card({ children, interactive, selected, disabled, onClick, className }: CardProps) {
  const classes = cn(
    BASE,
    selected && "border-[1.5px] border-accent-secondary",
    disabled && "opacity-50",
    interactive &&
      !disabled &&
      "active:shadow-2 active:scale-[0.99] transition-[transform,box-shadow] duration-(--motion-fast) ease-standard",
    className,
  );

  if (!interactive) return <div className={classes}>{children}</div>;

  return (
    <button
      type="button"
      data-selected={selected ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(classes, "tap-target")}
    >
      {children}
    </button>
  );
}

/** Content region of a card. Card owns the padding and surface; this owns the stack. */
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-sm", className)}>{children}</div>;
}

export function CardTruncatedText({
  text,
  maxChars,
  showMoreLabel,
}: {
  text: string;
  maxChars: number;
  showMoreLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxChars) return <p className="text-body">{text}</p>;
  if (expanded) return <p className="text-body">{text}</p>;
  return (
    <p className="text-body">
      {text.slice(0, maxChars).trimEnd()}…{" "}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-text-primary underline underline-offset-2"
      >
        {showMoreLabel}
      </button>
    </p>
  );
}
