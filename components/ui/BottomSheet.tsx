"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const pushed = useRef(false);

  // A history entry makes the Android back gesture and the iOS edge swipe close
  // the sheet rather than navigate away from the screen behind it.
  useEffect(() => {
    if (!open) return;
    history.pushState({ sheet: true }, "");
    pushed.current = true;

    const onPop = () => {
      pushed.current = false;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      if (pushed.current) {
        pushed.current = false;
        history.back();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        data-testid="sheet-scrim"
        onClick={onClose}
        className="absolute inset-0 bg-(--scrim)"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-lg bg-surface-raised p-lg shadow-3 motion-safe:animate-[sheet-in_var(--motion-slow)_var(--ease-standard)]"
      >
        <h2 id={titleId} className="text-h2 font-display">
          {title}
        </h2>
        <div className="mt-md">{children}</div>
      </div>
    </div>
  );
}
