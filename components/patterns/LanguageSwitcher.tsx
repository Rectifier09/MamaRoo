"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/config";

const LABELS: Record<Locale, string> = { en: "English", hi: "हिंदी" };

export function LanguageSwitcher({
  current,
  onSelect,
}: {
  current: Locale;
  onSelect: (locale: Locale) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={LABELS[current] === "English" ? "Language" : "भाषा"}
      className={cn("flex gap-sm transition-opacity duration-(--motion-slow) ease-standard", pending && "opacity-60")}
    >
      {(Object.keys(LABELS) as Locale[]).map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          onClick={() => {
            if (locale === current) return;
            startTransition(() => onSelect(locale));
          }}
          className={cn(
            "tap-target rounded-full px-md py-sm text-button",
            locale === current
              ? "bg-accent-primary font-medium text-surface-raised"
              : "border border-divider bg-surface text-text-primary",
          )}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
