"use client";

import { cn } from "@/lib/cn";

export function Tabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-md">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "tap-target text-body px-sm py-xs",
              active ? "bg-accent-primary text-surface-raised font-medium" : "text-text-secondary",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
