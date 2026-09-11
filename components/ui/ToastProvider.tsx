"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const HOLD_MS = 2000;

const ToastContext = createContext<{ show: (message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next); // replaces, never queues
    timer.current = setTimeout(() => setMessage(null), HOLD_MS);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message !== null && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-md bottom-[88px] z-50 rounded-sm bg-text-primary px-md py-sm text-body-sm text-surface-raised shadow-3"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
